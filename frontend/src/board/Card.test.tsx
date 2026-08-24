import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, type CardMenu, type CardRemoval } from './Card';
import { libraryItem } from '../test/library';
import { renderWithProviders } from '../test/render';
import type { LogStatus } from '../api/types';

/**
 * Both `removal.confirming` and `menu.open` are props rather than card state, so each is
 * exercised in two halves: pressing the control asks for the thing, and being the card it was
 * asked about renders it. Both live above the board for the same reason — a refetch remounts
 * cards, and neither a confirm nor an open menu may quietly close itself when one lands.
 */
function renderCard(
  item = libraryItem(),
  confirming = false,
  onMove = vi.fn(),
  onOpen = vi.fn(),
  menuOpen = false,
) {
  const removal: CardRemoval = {
    confirming,
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  const menu: CardMenu = { open: menuOpen, onOpen: vi.fn(), onClose: vi.fn() };

  const view = renderWithProviders(
    <Card
      item={item}
      onMove={onMove}
      removal={removal}
      menu={menu}
      onOpen={onOpen}
      draggable
    />,
    { dnd: true },
  );
  return { ...view, onMove, onOpen, removal, menu };
}

/** The corner control, and the only thing that opens the options. */
const optionsButton = (title = 'Celeste') =>
  screen.getByRole('button', { name: `Options for ${title}` });

/** A card with its menu already open, which is the state most of these are about. */
const renderOpen = (item = libraryItem({ title: 'Celeste' }), onMove = vi.fn()) =>
  renderCard(item, false, onMove, vi.fn(), true);

/**
 * A card under something listening for the press, which is what a drag listener is.
 *
 * The spy has to be a React prop rather than an addEventListener on the card: stopPropagation in
 * a React handler stops the *synthetic* event, and React attaches at the root container, so the
 * native event bubbles past the card either way and a native listener cannot tell the two cases
 * apart. dnd-kit's own listeners are React props, so this measures the layer that matters.
 */
function renderPressed() {
  const pressed = vi.fn();
  const removal: CardRemoval = {
    confirming: false,
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  renderWithProviders(
    <div onPointerDown={pressed}>
      <Card
        item={libraryItem({ title: 'Celeste', currentStatus: 'Backlog' })}
        onMove={vi.fn()}
        removal={removal}
        menu={{ open: false, onOpen: vi.fn(), onClose: vi.fn() }}
        onOpen={vi.fn()}
        draggable
      />
    </div>,
    { dnd: true },
  );

  return { pressed };
}

describe('Card', () => {
  it('names the title', () => {
    renderCard(libraryItem({ title: 'Hollow Knight' }));

    expect(screen.getByText('Hollow Knight')).toBeInTheDocument();
  });

  it('shows how long the game takes, marked as an estimate rather than as your own hours', () => {
    // The tilde is doing real work. The drawer prints "31.5 h" for what a pass took you, so an
    // unmarked number on a card would read as the same claim about a game you have not started.
    renderCard(libraryItem({ title: 'Hollow Knight', hltbMainStoryHours: 27 }));

    expect(screen.getByText('~27 h')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'About 27 hours to finish' }),
    ).toBeInTheDocument();
  });

  it('says nothing about length for a title HowLongToBeat has not been matched to', () => {
    renderCard(libraryItem({ hltbMainStoryHours: null }));

    expect(screen.queryByText(/h$/)).not.toBeInTheDocument();
  });

  it('shows a rating to one decimal, and nothing at all when unrated', () => {
    // 8.5 and 9.6 are the point of storing numeric(3,1) rather than an integer, so a card that
    // rounded to "9" would be throwing away the only reason the column has a decimal place.
    const rated = renderCard(libraryItem({ latestRating: 8.5 }));
    expect(screen.getByRole('img', { name: 'Rated 8.5 out of 10' })).toBeInTheDocument();
    rated.unmount();

    renderCard(libraryItem({ latestRating: null }));
    expect(screen.queryByRole('img', { name: /Rated/ })).not.toBeInTheDocument();
  });

  it('dates the last activity in the journal zone, not the browser one', () => {
    // 02:30 UTC on New Year's Day is 21:30 on the 31st here. The server files that completion
    // under 2025 and so must the card, or the year picker and the board disagree about the
    // same row.
    renderCard(libraryItem({ lastActivity: '2026-01-01T02:30:00+00:00' }));

    expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument();
  });

  it('marks a replay only when there has been more than one pass', () => {
    const replayed = renderCard(libraryItem({ entryCount: 2 }));
    expect(screen.getByRole('img', { name: '2 playthroughs' })).toBeInTheDocument();
    replayed.unmount();

    renderCard(libraryItem({ entryCount: 1 }));
    expect(screen.queryByRole('img', { name: /playthrough/ })).not.toBeInTheDocument();
  });

  it('names the genre it is painted as, so the colour never has to be learned', () => {
    // Ten hues is past what anyone can reliably tell apart, and past what colour-vision
    // deficiency leaves separable at all. The stripe is decoration; this is the information.
    renderCard(libraryItem({ genres: ['Adventure', 'Indie', 'Platform'], primaryGenre: null }));

    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('is painted as the genre you chose, not the one it would have picked', () => {
    renderCard(libraryItem({ genres: ['Adventure', 'Platform'], primaryGenre: 'Adventure' }));

    expect(screen.getByText('Adventure')).toBeInTheDocument();
    expect(screen.queryByText('Platform')).not.toBeInTheDocument();
  });

  it('keeps the stripe out of the accessibility tree, and the width the same without one', () => {
    // Always rendered, transparent when there is nothing to paint: a stripe that disappeared
    // would shift every ungenred card's contents twelve pixels left of its neighbours.
    const painted = renderCard(libraryItem({ genres: ['Shooter'], primaryGenre: null }));
    const stripe = painted.container.querySelector('[data-genre-stripe]');

    expect(stripe).not.toBeNull();
    expect(stripe).toHaveAttribute('aria-hidden', 'true');
    expect(stripe).toHaveClass('bg-genre-shooter');
    painted.unmount();

    const bare = renderCard(libraryItem({ genres: ['Indie'], primaryGenre: null }));

    expect(bare.container.querySelector('[data-genre-stripe]')).toHaveClass('bg-transparent');
    expect(screen.queryByText('Indie')).not.toBeInTheDocument();
  });

  it('shows the last thing you wrote about it', () => {
    // The journal is the point of the app, and until this it was entirely behind a click: the
    // board could tell you what you scored a game and not one word of what you said about it.
    renderCard(libraryItem({ latestNotePreview: 'Finally beat Hornet after forty tries.' }));

    expect(screen.getByText('Finally beat Hornet after forty tries.')).toBeInTheDocument();
  });

  it('says nothing at all when nothing has been written', () => {
    // Not an empty line held open for a note that may never come. Most of a backlog has never
    // been written on, and a column of cards each carrying a blank row is a raggeder board for
    // no information.
    const { container } = renderCard(libraryItem({ latestNotePreview: null }));

    expect(container.querySelector('[data-note]')).toBeNull();
  });

  it('keeps the options shut until they are asked for', () => {
    const { menu } = renderCard(libraryItem({ title: 'Celeste' }));

    expect(screen.queryByRole('group', { name: 'Options for Celeste' })).not.toBeInTheDocument();

    fireEvent.click(optionsButton());

    expect(menu.onOpen).toHaveBeenCalledOnce();
  });

  it.each<[LogStatus, string[]]>([
    ['Backlog', ['Move to Playing', 'Move to Completed', 'Move to Dropped']],
    ['InProgress', ['Move to Backlog', 'Move to Completed', 'Move to Dropped']],
    ['Completed', ['Move to Backlog', 'Move to Playing', 'Move to Dropped']],
    ['Dropped', ['Move to Backlog', 'Move to Playing', 'Move to Completed']],
  ])('offers every column but its own, from %s', (currentStatus, expected) => {
    // The whole point of the menu: a move without a drag, from every column rather than the two
    // that used to have a corner control at all. Dragging a card from the bottom of a forty-title
    // Backlog up to Completed is a scroll and a hold; this is two clicks.
    //
    // Never its own column, because the API treats a move to the status a title already has as a
    // silent no-op — an item that costs a request and changes nothing is worse than none.
    renderOpen(libraryItem({ title: 'Celeste', currentStatus }));

    const options = screen.getByRole('group', { name: 'Options for Celeste' });

    expect(
      within(options)
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((label) => label?.startsWith('Move')),
    ).toEqual(expected);
  });

  it('reports where the title is going, and the title, not the position it was in', async () => {
    const { onMove } = renderOpen(
      libraryItem({ mediaId: 42, title: 'Celeste', currentStatus: 'Backlog' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Move to Completed' }));

    expect(onMove).toHaveBeenCalledExactlyOnceWith(42, 'Completed');
  });

  it.each<LogStatus>(['Backlog', 'InProgress', 'Completed', 'Dropped'])(
    'offers both endings from %s, rather than one decided by the column',
    (currentStatus) => {
      // The corner used to mean *drop* on Playing and *remove* on Backlog, and be absent on the
      // other two — so which of the two endings you got was chosen by where the card sat rather
      // than by you. Dropping is still not removing; both are just reachable from anywhere now.
      renderOpen(libraryItem({ title: 'Celeste', currentStatus }));

      expect(screen.getByRole('button', { name: 'Remove from board' })).toBeInTheDocument();
      if (currentStatus !== 'Dropped') {
        expect(screen.getByRole('button', { name: 'Move to Dropped' })).toBeInTheDocument();
      }
    },
  );

  it('asks before it removes a title, because a delete is not one drag from undone', async () => {
    // Dropping can be taken back by dragging the card out again. This cannot, so it does not
    // happen on a single click, which is the reasoning the drawer's deletes already follow.
    const { removal, menu } = renderOpen(libraryItem({ mediaId: 42, title: 'Celeste' }));

    await userEvent.click(screen.getByRole('button', { name: 'Remove from board' }));

    expect(removal.onAsk).toHaveBeenCalledOnce();
    expect(removal.onConfirm).not.toHaveBeenCalled();

    // And the menu gets out of the way, or the question is asked behind the thing that asked it.
    expect(menu.onClose).toHaveBeenCalledOnce();
  });

  it('removes the title once that is confirmed', async () => {
    const { removal } = renderCard(libraryItem({ mediaId: 42, title: 'Celeste' }), true);

    await userEvent.click(screen.getByRole('button', { name: 'Really remove?' }));

    expect(removal.onConfirm).toHaveBeenCalledOnce();
  });

  it('takes over the metadata row while it asks, and gives it back on cancel', async () => {
    const asking = renderCard(libraryItem({ title: 'Celeste', latestRating: 8.5 }), true);
    expect(screen.queryByRole('img', { name: 'Rated 8.5 out of 10' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(asking.removal.onCancel).toHaveBeenCalledOnce();
    asking.unmount();

    renderCard(libraryItem({ title: 'Celeste', latestRating: 8.5 }), false);
    expect(screen.getByRole('img', { name: 'Rated 8.5 out of 10' })).toBeInTheDocument();
  });

  it('says the title is leaving the board when this is its only pass', () => {
    renderCard(libraryItem({ title: 'Celeste', entryCount: 1 }), true);

    expect(screen.getByText('Takes Celeste off your board.')).toBeInTheDocument();
  });

  it('says the earlier pass survives when there is one underneath', () => {
    // A finished game dragged back to Backlog gets a fresh entry rather than overwriting the
    // completion, so changing your mind about the replay leaves that completion standing.
    renderCard(libraryItem({ title: 'Celeste', entryCount: 2 }), true);

    expect(
      screen.getByText('Only this pass. Celeste stays, showing the one before it.'),
    ).toBeInTheDocument();
  });

  it('names the card its options belong to, and says it once', () => {
    // On the group rather than on every item. The items say "Move to Playing" and nothing more,
    // because the e2e card() locator filters on a card's own text — an item carrying a title
    // would make that locator match any card whose menu mentioned another card's game.
    renderOpen(libraryItem({ title: 'Hollow Knight' }));

    expect(screen.getByRole('group', { name: 'Options for Hollow Knight' })).toBeInTheDocument();
    expect(screen.queryByText(/Move Hollow Knight to/)).not.toBeInTheDocument();
  });

  it('closes on Escape and hands the keyboard back to the corner', async () => {
    // The drawer's rule and the settings menu's: a control that opened something is where focus
    // belongs when it shuts, or the next Tab starts from the top of the document.
    //
    // Handled on the menu rather than at the document, deliberately. The drawer already listens
    // for Escape there, and the search bar records why a second listener for one key is how two
    // of them start disagreeing about which press was meant for whom.
    const { menu } = renderOpen();

    await userEvent.click(screen.getByRole('button', { name: 'Move to Playing' }));
    await userEvent.keyboard('{Escape}');

    expect(menu.onClose).toHaveBeenCalled();
  });

  it('opens the title it names', async () => {
    // A button rather than a click handler on the card, so the journal is reachable by keyboard
    // and does not depend on a pointer gesture the drag is already listening for.
    const { onOpen } = renderCard(libraryItem({ mediaId: 42, title: 'Celeste' }));

    await userEvent.click(screen.getByRole('button', { name: 'Celeste' }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('lets a press on the title reach the card, so the drag can start there', () => {
    // The title is the biggest target on a card, so a press that lands on it has to be able to
    // become a drag — otherwise most of the card is dead to the gesture. What separates a click
    // from a drag is the pointer sensor's 8px activation distance, not this button swallowing
    // the press: below it the click lands, above it dnd-kit suppresses the click itself.
    //
    // jsdom has no layout and no pointer events, so this says only that the press propagates and
    // leaves the gesture to Playwright — see "a card drags from its title" in journal.spec.ts.
    const { pressed } = renderPressed();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Celeste' }));

    expect(pressed).toHaveBeenCalledOnce();
  });

  it('keeps the options corner from starting one, because it is a small target', () => {
    // The opposite call, deliberately: twenty pixels in the corner is a button and nothing else,
    // and a hand that wobbles past the threshold there would drag the card rather than open the
    // options. The title has room for both gestures; this does not.
    const { pressed } = renderPressed();

    fireEvent.pointerDown(optionsButton());

    expect(pressed).not.toHaveBeenCalled();
  });

  it('shows cover art when there is any, and falls back to an initial when there is not', () => {
    // The image is queried directly rather than by role: the title sits next to it as text, so
    // the cover is decorative and carries an empty alt on purpose.
    const withArt = renderCard(libraryItem({ coverUrl: 'https://images.igdb.com/co2l7l.jpg' }));
    expect(withArt.container.querySelector('img')).toHaveAttribute(
      'src',
      'https://images.igdb.com/co2l7l.jpg',
    );
    withArt.unmount();

    const { container: withoutCover } = renderCard(
      libraryItem({ coverUrl: null, title: 'Hades' }),
    );
    expect(withoutCover.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
