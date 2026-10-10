import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http } from 'msw';
import { BoardSearch } from './BoardSearch';
import { hiddenColumnsKey } from '../board/hiddenColumns';
import { game, searchServer } from '../test/games';
import { noteMatch, noteSearchServer } from '../test/notes';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';

const box = () => screen.getByRole('searchbox', { name: 'Search games' });
const notesBox = () => screen.getByRole('searchbox', { name: 'Search your notes' });
const choose = (what: 'Titles' | 'Notes') =>
  userEvent.click(
    within(screen.getByRole('radiogroup', { name: 'Search in' })).getByRole('radio', {
      name: what,
    }),
  );
const strip = () => screen.queryByRole('region', { name: 'Search results' });
const clearButton = () => screen.queryByRole('button', { name: 'Clear search' });

// A column taken off in Settings is remembered in storage, and must not follow one test into the
// next.
afterEach(() => localStorage.clear());

/**
 * Rendered on its own rather than through BoardPage, and not only for speed.
 *
 * A result's title and a card's title are both an h3, so the "in the order IGDB ranked it" test
 * below would be reading the board's cards as well if there were a board in the document. On its
 * own, the assertion can only be about what search returned.
 */
describe('BoardSearch', () => {
  it('asks IGDB nothing while the box is empty', async () => {
    const search = searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    expect(search.searches).toEqual([]);
  });

  it('keeps the board its full height until there is something to show', async () => {
    // The bar is always there; the strip is not. An empty box costs the board no room.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    expect(strip()).not.toBeInTheDocument();
  });

  it('waits for the typing to stop, then asks once', async () => {
    // Every call reaches IGDB — the API does not cache, deliberately — so six keystrokes must
    // not be six searches.
    const search = searchServer({ results: [game()] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    expect(search.searches).toEqual([]);

    await waitFor(() => expect(search.searches).toEqual(['hollow']));
  });

  it('shows what came back, in the order IGDB ranked it', async () => {
    // The database cannot reproduce relevance ordering, so nothing here re-sorts the results.
    searchServer({
      results: [
        game({ id: 1, title: 'Hollow Knight' }),
        game({ id: 2, title: 'Hollow Knight: Silksong' }),
      ],
    });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');

    await waitFor(() =>
      expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'Hollow Knight',
        'Hollow Knight: Silksong',
      ]),
    );
  });

  it('says when nothing matched, rather than showing an empty strip', async () => {
    searchServer({ results: [] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'zzzz');

    expect(await screen.findByText('Nothing matched “zzzz”.')).toBeInTheDocument();
  });

  it('passes on what the API said when IGDB is unhappy', async () => {
    // A 502 is a different message to a caller than "this app is broken", and the client keeps
    // the distinction — so this should not flatten it back into "something went wrong".
    searchServer({ searchStatus: 502 });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');

    expect(await screen.findByRole('alert')).toHaveTextContent('IGDB is unhappy.');
  });

  it('puts a result on the backlog', async () => {
    const search = searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to backlog' }),
    );

    await waitFor(() => expect(search.added).toEqual([{ mediaId: 3003, status: 'Backlog' }]));
  });

  it('puts a result straight into Playing, naming the column and nothing else', async () => {
    // The dates are the server's: a start is stamped by the rule a drag into Playing follows,
    // so nothing here sends one.
    const search = searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to playing' }),
    );

    await waitFor(() => expect(search.added).toEqual([{ mediaId: 3003, status: 'InProgress' }]));
  });

  it('says where the title went the moment the add is written, not a refetch later', async () => {
    // Otherwise the buttons stay live long enough to be pressed twice. From here on the library
    // never answers again, so the tile can only change on the add's own write.
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    const add = await screen.findByRole('button', { name: 'Add Hollow Knight to completed' });

    server.use(http.get('/api/library', () => new Promise<never>(() => {})));
    await userEvent.click(add);

    const tile = (await screen.findByRole('heading', { name: 'Hollow Knight' })).closest('li')!;
    await waitFor(() => expect(tile).toHaveTextContent('On your board: Completed'));
    // Nothing left to add with. The one button is the title's name, which opens its journal.
    expect(within(tile).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Hollow Knight',
    ]);
  });

  it('opens the journal of a title it has just added, without a trip to the board', async () => {
    // What this was asked for: find a game, put it on the board, and say something about it
    // straight away rather than going to look for its card.
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });
    const onOpen = vi.fn();

    renderWithProviders(<BoardSearch hobby="games" onOpen={onOpen} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(
      await screen.findByRole('button', { name: 'Add Hollow Knight to completed' }),
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Hollow Knight' }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(3003);
  });

  it('opens the journal of a title that was on your board before the search', async () => {
    // The other way the strip learns where a title is: from the library it reads, rather than
    // from an add of its own.
    searchServer({
      results: [game({ id: 3003, title: 'Hollow Knight' })],
      library: [{ mediaId: 3003, status: 'InProgress' }],
    });
    const onOpen = vi.fn();

    renderWithProviders(<BoardSearch hobby="games" onOpen={onOpen} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await userEvent.click(await screen.findByRole('button', { name: 'Hollow Knight' }));

    expect(onOpen).toHaveBeenCalledExactlyOnceWith(3003);
  });

  it('says which column a title in your library is in, instead of offering it again', async () => {
    searchServer({
      results: [game({ id: 3003, title: 'Hollow Knight' })],
      library: [{ mediaId: 3003, status: 'Completed' }],
    });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');

    const tile = (await screen.findByRole('heading', { name: 'Hollow Knight' })).closest('li')!;
    await waitFor(() => expect(tile).toHaveTextContent('On your board: Completed'));
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to backlog' }),
    ).not.toBeInTheDocument();
  });

  it('offers no column the board has taken off in Settings', async () => {
    // The card menu's rule: a column the board is not drawing is nowhere a title can be sent,
    // because it would land somewhere nobody can see it.
    localStorage.setItem(hiddenColumnsKey('games'), JSON.stringify(['Completed']));
    searchServer({ results: [game({ id: 3003, title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');

    expect(
      await screen.findByRole('button', { name: 'Add Hollow Knight to playing' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Add Hollow Knight to completed' }),
    ).not.toBeInTheDocument();
  });

  it('gives the board back when the search is cleared', async () => {
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.clear(box());

    await waitFor(() => expect(strip()).not.toBeInTheDocument());
  });

  it('offers nothing to clear while the box is empty', async () => {
    // A control that does nothing is worse than no control: there is nothing to clear, and a
    // dead × sitting in the box reads as something that has stopped working.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);

    expect(clearButton()).not.toBeInTheDocument();

    await userEvent.type(box(), 'hollow');

    expect(clearButton()).toBeInTheDocument();
  });

  it('clears the box and gives the keyboard back to it', async () => {
    // The focus half is the part worth pinning. The button unmounts the moment it works, so
    // without this the keyboard is left on the document body — which is a worse place to be
    // than where it started, and only someone tabbing would ever notice.
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    await waitFor(() => expect(strip()).not.toBeInTheDocument());
  });

  it('offers the Discover page while the box is empty, and takes the offer away once there is typing', async () => {
    // For somebody who does not know what to search for, which is exactly when the box is empty.
    // Once there is typing, the strip is the answer and the offer would only be in its way.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);

    const offer = await screen.findByRole('link', { name: 'Browse popular games' });
    expect(offer).toHaveAttribute('href', '/board/games/discover');
    expect(offer.closest('p')).toHaveTextContent('Not sure what to add? Browse popular games');

    await userEvent.type(box(), 'hollow');

    expect(screen.queryByRole('link', { name: 'Browse popular games' })).not.toBeInTheDocument();
  });

  it('keeps the box named for what it is, with the offer beside the label rather than in it', async () => {
    // A wrapping label takes all of its text as the input's name, so a link inside it would make
    // the box announce itself as "Search games Not sure what to add? Browse popular games" — and
    // every spec that finds the box by name would stop finding it. The clear button's rule.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await screen.findByRole('link', { name: 'Browse popular games' });

    expect(box()).toHaveAccessibleName('Search games');
  });

  it('offers nothing on a board whose hobby has no Discover page', async () => {
    searchServer();

    renderWithProviders(<BoardSearch hobby="movies" onOpen={vi.fn()} onOpenNote={vi.fn()} />, { route: '/board/movies' });
    await waitFor(() =>
      expect(screen.getByRole('searchbox', { name: 'Search movies' })).toBeInTheDocument(),
    );

    expect(screen.queryByRole('link', { name: /^Browse popular/ })).not.toBeInTheDocument();
  });

  it('takes the results away on Escape without leaving the board', async () => {
    // Escape is handled on the search itself rather than on the document: the journal drawer
    // already owns a document-level Escape, and two listeners for one key is how they start
    // disagreeing about which of them the press was meant for.
    searchServer({ results: [game({ title: 'Hollow Knight' })] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('region', { name: 'Search results' });

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(strip()).not.toBeInTheDocument());
    expect(box()).toHaveValue('');
  });

  it('takes the keyboard to the box on /, without typing the slash into it', async () => {
    // From wherever the keyboard is on the board, which for the bar on its own is the document
    // body. The slash is the half worth pinning: focus moved during a keydown takes the keypress
    // with it, so without preventDefault every search begun this way would begin with one.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    await userEvent.keyboard('/');

    expect(box()).toHaveFocus();
    expect(box()).toHaveValue('');
  });

  it('answers a slash typed with Shift held, which is how a German or French keyboard types one', async () => {
    // `key` is the character the keyboard made, whatever it took to make it, so a rule about
    // modifiers that counted Shift would take the shortcut away from every such keyboard. On a
    // US one, Shift and that key make "?", which is a different key to this listener.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await waitFor(() => expect(box()).toBeInTheDocument());

    await userEvent.keyboard('{Shift>}/{/Shift}');

    expect(box()).toHaveFocus();
    expect(box()).toHaveValue('');
  });

  it.each(['Control', 'Alt', 'Meta'])(
    'leaves %s+/ to whatever it is a shortcut for',
    async (modifier) => {
      searchServer();

      renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
      await waitFor(() => expect(box()).toBeInTheDocument());

      await userEvent.keyboard(`{${modifier}>}/{/${modifier}}`);

      expect(box()).not.toHaveFocus();
    },
  );

  it('types a slash into the box like any other character', async () => {
    // The box is a field like any other, and the one a slash is likeliest to be typed into:
    // Fate/stay night, and most of the series after it.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'fate/stay');

    expect(box()).toHaveValue('fate/stay');
  });

  it.each([
    ['a text box', <input aria-label="Elsewhere" />],
    ['a text area', <textarea aria-label="Elsewhere" />],
    [
      'a select',
      <select aria-label="Elsewhere">
        <option>One</option>
      </select>,
    ],
  ])('leaves a slash typed into %s elsewhere on the page where it was typed', async (_, field) => {
    // Whatever else the page holds, now or later. Stand-ins rather than the journal's note box,
    // because the journal is modal and holds the key on its own, which is BoardPage's test and
    // not this one.
    searchServer();

    renderWithProviders(
      <>
        <BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />
        {field}
      </>,
    );
    await waitFor(() => expect(box()).toBeInTheDocument());
    const elsewhere = screen.getByLabelText('Elsewhere');
    await userEvent.click(elsewhere);

    await userEvent.keyboard('/');

    expect(elsewhere).toHaveFocus();
  });
});

/**
 * The same box, searching what you wrote rather than what there is to add.
 *
 * One box with a switch beside it, picked at the #6 workshop over a box of its own and over one
 * box searching both: a phrase from a note sent to IGDB comes back as a strip of games nobody
 * asked about.
 */
describe('BoardSearch, searching your notes', () => {
  it('starts on Titles, with Notes beside it', async () => {
    // Every time the board loads: the bar's first job is adding titles, and a board that opened
    // on Notes would send a game's name to your notes.
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);

    const choices = within(screen.getByRole('radiogroup', { name: 'Search in' })).getAllByRole(
      'radio',
    );
    expect(choices.map((choice) => [choice.textContent, choice.getAttribute('aria-checked')])).toEqual([
      ['Titles', 'true'],
      ['Notes', 'false'],
    ]);
    expect(box()).toBeInTheDocument();
  });

  it("searches this board's notes once Notes is chosen, and asks IGDB nothing", async () => {
    const titles = searchServer();
    const notes = noteSearchServer({ notes: [noteMatch()] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');
    await userEvent.type(notesBox(), 'boss');

    await waitFor(() => expect(notes.searches).toEqual([{ q: 'boss', hobby: 'games' }]));
    expect(titles.searches).toEqual([]);
  });

  it('asks your notes nothing while it searches titles', async () => {
    // The two searches are two queries, and only the switch's runs. Waited for through the
    // titles' own answer: both would be sent on the same keystroke, so by the time the tile is
    // drawn, a search of the notes would have been asked for too.
    searchServer({ results: [game({ title: 'Hollow Knight' })] });
    const notes = noteSearchServer({ notes: [noteMatch()] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await screen.findByRole('heading', { name: 'Hollow Knight' });

    expect(notes.searches).toEqual([]);
  });

  it('keeps the words when the switch flips, and searches the other side with them', async () => {
    const titles = searchServer({ results: [game()] });
    const notes = noteSearchServer({ notes: [noteMatch()] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await userEvent.type(box(), 'hollow');
    await waitFor(() => expect(titles.searches).toEqual(['hollow']));

    await choose('Notes');

    expect(notesBox()).toHaveValue('hollow');
    await waitFor(() => expect(notes.searches).toEqual([{ q: 'hollow', hobby: 'games' }]));

    await choose('Titles');

    expect(box()).toHaveValue('hollow');
  });

  it('names the box for what it searches', async () => {
    searchServer();
    noteSearchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');

    expect(notesBox()).toHaveAttribute('placeholder', 'Search your notes…');
  });

  it("takes Discover's offer away while it searches notes, which it is not about", async () => {
    searchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await screen.findByRole('link', { name: 'Browse popular games' });

    await choose('Notes');

    expect(screen.queryByRole('link', { name: 'Browse popular games' })).not.toBeInTheDocument();
  });

  it('asks nothing while the box is empty', async () => {
    searchServer();
    const notes = noteSearchServer();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');

    expect(notes.searches).toEqual([]);
    expect(strip()).not.toBeInTheDocument();
  });

  it('shows the notes found under their titles', async () => {
    searchServer();
    noteSearchServer({
      notes: [noteMatch({ id: 11, body: 'Moss Mother took twelve tries. First boss and already humbled.' })],
    });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');
    await userEvent.type(notesBox(), 'boss');

    const results = await screen.findByRole('region', { name: 'Search results' });
    expect(
      await within(results).findByRole('heading', { name: 'Hollow Knight: Silksong' }),
    ).toBeInTheDocument();
    expect(within(results).getByRole('button', { name: /Moss Mother/ })).toBeInTheDocument();
  });

  it('opens the note pressed, with the words it was found by', async () => {
    // The words go with it, so the journal can mark them in the note it opens at.
    searchServer();
    noteSearchServer({ notes: [noteMatch({ id: 11, mediaId: 32 })] });
    const onOpenNote = vi.fn();

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={onOpenNote} />);
    await choose('Notes');
    await userEvent.type(notesBox(), 'first   BOSS');
    await userEvent.click(await screen.findByRole('button', { name: /Moss Mother/ }));

    expect(onOpenNote).toHaveBeenCalledExactlyOnceWith(32, 11, ['first', 'BOSS']);
  });

  it('says when no note matched, rather than showing an empty strip', async () => {
    searchServer();
    noteSearchServer({ notes: [] });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');
    await userEvent.type(notesBox(), 'zeppelin');

    expect(await screen.findByText('Nothing in your notes matched “zeppelin”.')).toBeInTheDocument();
  });

  it('passes on what the API said when the search fails', async () => {
    searchServer();
    noteSearchServer({ status: 500 });

    renderWithProviders(<BoardSearch hobby="games" onOpen={vi.fn()} onOpenNote={vi.fn()} />);
    await choose('Notes');
    await userEvent.type(notesBox(), 'boss');

    expect(await screen.findByRole('alert')).toHaveTextContent('The notes could not be searched.');
  });
});
