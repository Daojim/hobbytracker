import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
    // The headline figure rather than main story, which is what this used to show. Hollow
    // Knight's main story is 27 and the number the site leads with is 42.
    renderCard(libraryItem({ title: 'Hollow Knight', lengthHours: 42 }));

    expect(screen.getByText('~42 h')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'About 42 hours to finish' }),
    ).toBeInTheDocument();
  });

  it('says nothing about length for a title HowLongToBeat has not been matched to', () => {
    renderCard(libraryItem({ lengthHours: null }));

    expect(screen.queryByText(/h$/)).not.toBeInTheDocument();
  });

  it('says where you are in a show, beside the rating', () => {
    // The point of a TV board. A film is watched or it is not; a show is a thing you are three
    // seasons into, and a card that cannot say so is a card you have to open to read.
    renderCard(
      libraryItem({
        hobby: 'tv',
        title: 'Severance',
        seasonNumber: 3,
        episodeNumber: 7,
      }),
    );

    expect(screen.getByText('S3 E7')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Season 3, episode 7' })).toBeInTheDocument();
  });

  it('asks the hobby whether it has progress at all, rather than reading the nulls', () => {
    // The right way round: a game whose pass somehow carried a season still prints nothing,
    // because a games card has no such idea. Inferring it from the values would put a badge on
    // a board that has no word for it.
    renderCard(
      libraryItem({ hobby: 'games', title: 'Hollow Knight', seasonNumber: 3, episodeNumber: 7 }),
    );

    expect(screen.queryByText('S3 E7')).not.toBeInTheDocument();
  });

  it('leaves the badge off a show nobody has said where they are in', () => {
    renderCard(
      libraryItem({ hobby: 'tv', title: 'Severance', seasonNumber: null, episodeNumber: null }),
    );

    expect(screen.queryByText(/^S\d/)).not.toBeInTheDocument();
  });

  it('leaves out a second title that is the same as the first', () => {
    // Found by the e2e suite rather than reasoned about, and not a stub artefact: MAL answers
    // `alternative_titles.en` of "Cowboy Bebop" for Cowboy Bebop, and does the same for every
    // title whose romaji reading is already English. Rendered blindly, those cards print their
    // own name twice.
    const same = renderCard(
      libraryItem({ hobby: 'anime', title: 'Cowboy Bebop', subtitle: 'Cowboy Bebop' }),
    );

    expect(same.container.querySelector('[data-subtitle]')).toBeNull();

    // Case and surrounding space are not a difference a reader would call one, and anything
    // looser than that is wrong: Frieren and Frieren: Beyond Journey's End are two names.
    const cased = renderCard(
      libraryItem({ hobby: 'anime', title: 'Cowboy Bebop', subtitle: '  cowboy bebop ' }),
    );

    expect(cased.container.querySelector('[data-subtitle]')).toBeNull();
  });

  it('says which episode of an anime, with no season half to be missing', () => {
    // Television refuses to print an episode with no season, on the argument that it would be
    // inventing the half that is missing. That is right *for television* — and wrong here,
    // which is why the two hobbies format their own. A cour is its own MAL entry, so the cour
    // is the title and episode 12 says everything there is to say.
    renderCard(
      libraryItem({
        hobby: 'anime',
        title: 'Sousou no Frieren',
        seasonNumber: null,
        episodeNumber: 12,
      }),
    );

    expect(screen.getByText('E12')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Episode 12' })).toBeInTheDocument();
  });

  it("prints the row's second title under its first, and nothing when there is none", () => {
    // The second stretch this hobby asked of the platform, and the card is where it lands. The
    // row decides which name leads — for an anime that is MAL's English title, with the romaji
    // one it was matched on underneath — and the card renders the pair it is given without
    // knowing whose names they are.
    const named = renderCard(
      libraryItem({
        hobby: 'anime',
        title: "Frieren: Beyond Journey's End",
        subtitle: 'Sousou no Frieren',
      }),
    );

    expect(named.getByText('Sousou no Frieren')).toBeInTheDocument();

    // Outside the heading, so a screen reader reads the title as the title. An accessible name
    // carrying both would be the one string nobody could search for.
    expect(
      named.getByRole('heading', { name: "Frieren: Beyond Journey's End" }),
    ).toBeInTheDocument();

    // Absent rather than blank, which is the ordinary case: MAL leaves the English title off a
    // great many entries, and every other hobby sends null always. A blank line would push the
    // metadata row down on some cards and not others.
    const bare = renderCard(
      libraryItem({ hobby: 'anime', title: 'Ping Pong the Animation', subtitle: null }),
    );

    expect(bare.container.querySelector('[data-subtitle]')).toBeNull();
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
    // Eleven hues is past what anyone can reliably tell apart, and past what colour-vision
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
  ])('offers every column but its own, from %s, in board order', (currentStatus, expected) => {
    // The whole point of the menu: a move without a drag, from every column rather than the two
    // that used to have a corner control at all. Dragging a card from the bottom of a forty-title
    // Backlog up to Completed is a scroll and a hold; this is two clicks.
    //
    // Never its own column, because the API treats a move to the status a title already has as a
    // silent no-op — an item that costs a request and changes nothing is worse than none.
    //
    // In board order, so the menu and the columns behind it do not disagree about the order of
    // the same four things: otherColumns filters BOARD_STATUSES rather than carrying a list of
    // its own. Dropped moving back to the far right moves it to the bottom of the three here,
    // above the one item that is not a move.
    renderOpen(libraryItem({ title: 'Celeste', currentStatus }));

    const options = screen.getByRole('group', { name: 'Options for Celeste' });

    expect(
      within(options)
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((label) => label?.startsWith('Move')),
    ).toEqual(expected);
  });

  it('opens the journal from the menu as well as from the title', async () => {
    // A second door to the same drawer. The title is the discoverable one and stays the primary,
    // but it is also the one gesture on a card that competes with the drag — so a menu item that
    // cannot be mistaken for the start of one is worth having beside it.
    //
    // "Open journal" rather than "Edit game": every other hobby gets this menu unchanged, and a
    // journal is a journal whether the thing is a game, a film or an album.
    const { onOpen, menu } = renderOpen(libraryItem({ mediaId: 42, title: 'Celeste' }));

    await userEvent.click(screen.getByRole('button', { name: 'Open journal' }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(42);
    expect(menu.onClose).toHaveBeenCalledOnce();
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

  it('counts the playthroughs it would take with it, when there is more than one', () => {
    // The number is the whole warning. Removing takes every pass and everything written during
    // them, so a title carrying a 2024 completion and two replays is losing three records —
    // and "off your board" alone reads like it is losing a card.
    renderCard(libraryItem({ title: 'Celeste', entryCount: 3 }), true);

    expect(
      screen.getByText('Takes Celeste off your board — all 3 playthroughs, and their notes.'),
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

  describe('a title that has just come out', () => {
    const TODAY = new Date('2026-09-15T16:00:00Z');

    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(TODAY);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('wears a badge saying so', () => {
      // A title reaches Backlog on its release day with nothing having run and nothing to
      // announce it — that is the whole elegance of the calendar being a view rather than a
      // place. The cost is that the thing you were waiting for simply appears among things
      // queued for years, and this is what stops that being silent.
      renderCard(
        libraryItem({
          title: 'Silksong II',
          releaseDate: '2026-09-10',
          releaseEnd: '2026-09-10',
          releasePrecision: 'Day',
        }),
      );

      expect(screen.getByText('New')).toBeInTheDocument();
    });

    it('stops wearing it once it is no longer news', () => {
      renderCard(
        libraryItem({
          title: 'Hollow Knight',
          releaseDate: '2017-02-24',
          releaseEnd: '2017-02-24',
          releasePrecision: 'Day',
        }),
      );

      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('never wears it on a date vaguer than a day', () => {
      // A title announced for "Q1 2027" carries 31 March, and calling it new on 1 April would
      // be announcing a day nobody said. A vague window is never new; it simply arrives.
      renderCard(
        libraryItem({
          title: 'Vague',
          releaseDate: '2026-07-01',
          releaseEnd: '2026-09-30',
          releasePrecision: 'Quarter',
        }),
      );

      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });

    it('never wears it on a title nobody has asked a provider about', () => {
      // Which is every row that predates the release calendar, so this is also what says a
      // board full of old titles does not light up the first time the feature ships.
      renderCard(libraryItem({ title: 'Never Asked' }));

      expect(screen.queryByText('New')).not.toBeInTheDocument();
    });
  });
});
