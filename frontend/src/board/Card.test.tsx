import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card, type CardRemoval } from './Card';
import { libraryItem } from '../test/library';
import { renderWithProviders } from '../test/render';
import type { LogStatus } from '../api/types';

/**
 * `removal.confirming` is a prop rather than card state, so the two halves are exercised
 * separately: clicking the corner asks, and being the card asked about renders the confirm.
 */
function renderCard(
  item = libraryItem(),
  confirming = false,
  onDrop = vi.fn(),
  onOpen = vi.fn(),
) {
  const removal: CardRemoval = {
    confirming,
    onAsk: vi.fn(),
    onCancel: vi.fn(),
    onConfirm: vi.fn(),
  };

  const view = renderWithProviders(
    <Card item={item} onDrop={onDrop} removal={removal} onOpen={onOpen} draggable />,
    { dnd: true },
  );
  return { ...view, onDrop, onOpen, removal };
}

const removeButton = (title = 'Celeste') =>
  screen.getByRole('button', { name: `Remove ${title} from your board` });

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
        onDrop={vi.fn()}
        removal={removal}
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

  it('offers a drop button on Playing, where giving up on a game did happen', () => {
    renderCard(libraryItem({ title: 'Celeste', currentStatus: 'InProgress' }));

    expect(screen.getByRole('button', { name: 'Drop Celeste' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Remove Celeste from your board' }),
    ).not.toBeInTheDocument();
  });

  it('offers a remove button on Backlog, where there is nothing yet to give up on', () => {
    // Dropped is a record of a game you started and abandoned. A game you never began has
    // nothing to abandon, so closing it takes it off the board rather than moving it to a
    // column that would claim you played it.
    renderCard(libraryItem({ title: 'Celeste', currentStatus: 'Backlog' }));

    expect(removeButton()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Drop Celeste' })).not.toBeInTheDocument();
  });

  it.each<LogStatus>(['Completed', 'Dropped'])(
    'offers neither on %s, where both would mean nothing',
    (currentStatus) => {
      renderCard(libraryItem({ title: 'Celeste', currentStatus }));

      expect(screen.queryByRole('button', { name: 'Drop Celeste' })).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Remove Celeste from your board' }),
      ).not.toBeInTheDocument();
    },
  );

  it('reports the title being dropped, not the position it was in', async () => {
    const { onDrop } = renderCard(
      libraryItem({ mediaId: 42, title: 'Celeste', currentStatus: 'InProgress' }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Drop Celeste' }));

    expect(onDrop).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('asks before it removes a title, because a delete is not one drag from undone', async () => {
    // Dropping can be taken back by dragging the card out again. This cannot, so it does not
    // happen on a single click, which is the reasoning the drawer's deletes already follow.
    const { removal } = renderCard(libraryItem({ mediaId: 42, title: 'Celeste' }));

    await userEvent.click(removeButton());

    expect(removal.onAsk).toHaveBeenCalledOnce();
    expect(removal.onConfirm).not.toHaveBeenCalled();
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

  it('keeps the close corner from starting one, because it is a small target', () => {
    // The opposite call, deliberately: twenty pixels in the corner is a button and nothing else,
    // and a hand that wobbles past the threshold there would drag the card rather than remove
    // the title. The title has room for both gestures; this does not.
    const { pressed } = renderPressed();

    fireEvent.pointerDown(removeButton());

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
