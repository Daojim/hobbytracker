import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EntryDrawer } from './EntryDrawer';
import { gameDetail, journalServer, logEntry, note } from '../test/games';
import { movieDetail, movieJournalServer } from '../test/movies';
import { tvShowDetail, tvJournalServer } from '../test/tv';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { mediaKey } from '../board/keys';

const rating = () => screen.getByRole('spinbutton', { name: 'Exact rating' });
const slider = () => screen.getByRole('slider', { name: 'Rating' });
const started = () => screen.getByLabelText('Started');
const save = () => screen.getByRole('button', { name: 'Save' });

function open(mediaId = 3003, onClose = vi.fn()) {
  return { onClose, ...renderWithProviders(<EntryDrawer hobby="games" mediaId={mediaId} onClose={onClose} />) };
}

describe('EntryDrawer', () => {
  it('shows the game and fills the form from the pass the board is showing', async () => {
    journalServer({
      detail: gameDetail({
        title: 'Celeste',
        logEntries: [
          logEntry({
            id: 7,
            rating: 8.5,
            startedAt: '2026-08-21T01:30:00+00:00',
          }),
        ],
      }),
    });

    open();

    expect(await screen.findByRole('heading', { name: 'Celeste' })).toBeInTheDocument();
    expect(rating()).toHaveValue(8.5);
    // 01:30 UTC is the evening before here, and the input has to agree with the card.
    expect(started()).toHaveValue('2026-08-20');
  });

  it('sends every field, because an omitted one is a cleared one', async () => {
    // The API takes PUT rather than PATCH on purpose: absent means cleared. Sending only what
    // changed would wipe the notes every time someone edited a rating.
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, status: 'InProgress' })],
      }),
    });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '8.5');
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.id).toBe(7);
    expect(journal.saved[0]?.body).toEqual({
      status: 'InProgress',
      rating: 8.5,
      platform: null,
      hoursPlayed: null,
      startedAt: null,
      completedAt: null,
      seasonNumber: null,
      episodeNumber: null,
    });
  });

  it('says it saved, and keeps saying it through the refetch that remounts the form', async () => {
    // The form is keyed on the values it was seeded from, so a save that changed anything
    // remounts it — which is exactly where a "Saved" held inside the form would be destroyed
    // half a second after appearing. The drawer holds it, above the key, for that reason.
    let stored: number | null = null;
    server.use(
      http.get('/api/games/:id', () =>
        HttpResponse.json(gameDetail({ logEntries: [logEntry({ id: 7, rating: stored })] })),
      ),
      http.put('/api/log-entries/:id', async ({ request }) => {
        const body = (await request.json()) as { rating: number | null };
        stored = body.rating;
        return HttpResponse.json(logEntry({ id: 7, rating: stored }));
      }),
    );

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '8.5');
    await userEvent.click(save());

    // A status rather than plain text: a confirmation nobody can see is not a confirmation.
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');

    // And it is still there once the refetch has landed and the form has been rebuilt from it.
    await waitFor(() => expect(stored).toBe(8.5));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
  });

  it('says nothing about saving before anything has been saved', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    await screen.findByRole('button', { name: 'Save' });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('takes the confirmation back as soon as the form is edited again', async () => {
    // "Saved" beside a form that has changed since is a lie, and a worse one than saying
    // nothing: it is the state the reader is trusting when they close the drawer.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');

    await userEvent.type(screen.getByRole('spinbutton', { name: 'Exact rating' }), '9');

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('rates by slider, and the box follows', async () => {
    const journal = journalServer({
      detail: gameDetail({ logEntries: [logEntry({ id: 7, status: 'InProgress' })] }),
    });

    open();
    // A range input ignores userEvent.type: it has no text to receive. fireEvent is how a drag
    // reaches it, which is what the pointer does in a real browser.
    fireEvent.change(await screen.findByRole('slider', { name: 'Rating' }), {
      target: { value: '8.5' },
    });

    expect(rating()).toHaveValue(8.5);

    await userEvent.click(save());
    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body['rating']).toBe(8.5);
  });

  it('rates by the box, and the handle follows', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '8.3');

    expect(slider()).toHaveValue('8.3');
  });

  it('leaves the handle where it was while a rating is half-typed', async () => {
    // "8." and "8.75" are both refused by the rule, and deriving the handle from the text would
    // throw it to the far left on each of them on the way to 8.7 — a jump nobody asked for.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    const box = await screen.findByRole('spinbutton', { name: 'Exact rating' });
    await userEvent.type(box, '8');
    expect(slider()).toHaveValue('8');

    await userEvent.type(box, '.');
    expect(slider()).toHaveValue('8');

    await userEvent.type(box, '75');
    expect(slider()).toHaveValue('8.7');
  });

  it('says a pass is unrated rather than announcing a 1.0 nobody chose', async () => {
    // A range input always holds a value, so "not rated" has to be said out loud — otherwise
    // the handle parked at the low end reads as the lowest possible score.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7, rating: null })] }) });

    open();

    expect(await screen.findByRole('slider', { name: 'Rating' })).toHaveAttribute(
      'aria-valuetext',
      'Not rated',
    );
    expect(rating()).toHaveValue(null);
    expect(screen.queryByRole('button', { name: 'Clear rating' })).not.toBeInTheDocument();
  });

  it('clears back to unrated, and sends that as null', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, status: 'InProgress', rating: 8.5 })],
      }),
    });

    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Clear rating' }));

    expect(rating()).toHaveValue(null);
    expect(slider()).toHaveAttribute('aria-valuetext', 'Not rated');

    await userEvent.click(save());
    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body['rating']).toBeNull();
  });

  it('gives an untouched date back as the instant it was, not as midnight', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, startedAt: '2026-08-21T01:30:00+00:00' })],
      }),
    });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '9');
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body['startedAt']).toBe('2026-08-21T01:30:00+00:00');
  });

  it('sends an edited date as a bare day, which the server reads as a day here', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, startedAt: '2026-08-21T01:30:00+00:00' })],
      }),
    });

    open();
    await userEvent.clear(await screen.findByLabelText('Started'));
    await userEvent.type(started(), '2026-08-19');
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body['startedAt']).toBe('2026-08-19');
  });

  it('refuses a two-decimal rating without asking the server', async () => {
    // numeric(3,1) rounds 8.75 to 8.8 rather than rejecting it, which is why the API refuses
    // two places — an accepted one would mean reporting a rating the database does not hold.
    const journal = journalServer();

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '8.75');
    await userEvent.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(/one decimal place/);
    expect(journal.saved).toHaveLength(0);
  });

  it('refuses a completion earlier than the start', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, startedAt: '2026-08-21T01:30:00+00:00' })],
      }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('Completed'), '2026-08-01');
    await userEvent.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(/earlier than/);
    expect(journal.saved).toHaveLength(0);
  });

  it('shows which field the server rejected, not just that something was wrong', async () => {
    journalServer({ saveErrors: { rating: ['Rating must be between 1.0 and 10.0.'] } });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '9');
    await userEvent.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Rating must be between 1.0 and 10.0.',
    );
  });

  it('shows earlier passes without offering to edit them', async () => {
    // The 2024 completion is what the whole multi-entry schema exists to protect, and there is
    // nowhere else in the app that shows it at all.
    journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({ id: 9, status: 'InProgress' }),
          logEntry({
            id: 7,
            status: 'Completed',
            rating: 9.6,
            completedAt: '2024-11-02T18:00:00+00:00',
          }),
        ],
      }),
    });

    open();

    expect(await screen.findByText('Earlier passes')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Completed Nov 2, 2024' })).toBeInTheDocument();
    // One form, for the current pass. The history is a record, not a set of inputs.
    expect(screen.getAllByRole('slider', { name: 'Rating' })).toHaveLength(1);
    expect(screen.getAllByRole('spinbutton', { name: 'Exact rating' })).toHaveLength(1);
  });

  it('closes when asked', async () => {
    journalServer();

    const { onClose } = open();
    await userEvent.click(await screen.findByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('re-fills the form when the pass changes underneath it', async () => {
    // A drag edits the current entry in place, so its id does not change — and the form seeds
    // its inputs once, from whatever the entry said when it mounted. Keying the form on the id
    // alone meant a game dragged to Playing still showed an empty Started when you reopened it.
    let asked = 0;
    server.use(
      http.get('/api/games/:id', () => {
        asked += 1;
        return HttpResponse.json(
          gameDetail({
            logEntries: [
              logEntry({
                id: 9,
                status: asked === 1 ? 'Backlog' : 'InProgress',
                startedAt: asked === 1 ? null : '2026-08-21T16:00:00+00:00',
              }),
            ],
          }),
        );
      }),
    );

    const { queryClient } = open();
    expect(await screen.findByLabelText('Started')).toHaveValue('');

    await act(async () => {
      await queryClient.invalidateQueries({ queryKey: mediaKey('games', 3003) });
    });

    await waitFor(() => expect(started()).toHaveValue('2026-08-21'));
  });

  it('is a dialog, named by the title it is about', async () => {
    journalServer();

    open();

    expect(await screen.findByRole('dialog', { name: 'Hollow Knight' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
  });

  it('takes focus when it opens', async () => {
    journalServer();

    open();

    // Otherwise the keyboard is still on the board behind, and the first Tab walks the columns.
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
  });

  it('closes when the backdrop is clicked', async () => {
    journalServer();

    const { onClose } = open();
    await userEvent.click(await screen.findByRole('presentation'));

    expect(onClose).toHaveBeenCalled();
  });

  it('closes on Escape', async () => {
    journalServer();

    const { onClose } = open();
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('stays open when the panel itself is clicked', async () => {
    journalServer();

    const { onClose } = open();
    await userEvent.click(await screen.findByText('Hollow Knight'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside itself', async () => {
    // aria-modal promises a screen reader that the board behind is inert. Letting the keyboard
    // walk out onto it would make that promise false for everyone who reads it by tabbing.
    journalServer();

    open();
    await screen.findByRole('button', { name: 'Save' });
    const dialog = screen.getByRole('dialog');

    // More presses than the panel has controls, so this exercises the wrap and not merely the
    // walk — and it says the invariant rather than naming whichever control happens to be last.
    for (let press = 0; press < 12; press += 1) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }

    await userEvent.tab({ shift: true });
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('asks before it deletes a pass', async () => {
    // A drag to Completed and back leaves ×2 forever, so this had to exist — but it is the one
    // control in the drawer that destroys something, and a mis-click should cost a second click
    // rather than a playthrough.
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 9 }), logEntry({ id: 7, status: 'Completed' })],
      }),
    });

    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this pass' }));

    expect(journal.deleted).toEqual([]);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('deletes the current pass once it is confirmed', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 9 }), logEntry({ id: 7, status: 'Completed' })],
      }),
    });

    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this pass' }));
    await userEvent.click(screen.getByRole('button', { name: 'Really delete?' }));

    await waitFor(() => expect(journal.deleted).toEqual([9]));
  });

  it('deletes an earlier pass, naming which one it would take', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({ id: 9 }),
          logEntry({ id: 7, status: 'Completed', completedAt: '2024-11-02T18:00:00+00:00' }),
        ],
      }),
    });

    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete the Completed pass from Nov 2, 2024' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Really delete?' }));

    await waitFor(() => expect(journal.deleted).toEqual([7]));
  });

  it('says when deleting the last pass would take the title off the board', async () => {
    // The library is titles you have logged something against, so the last pass leaving means
    // the card leaves with it. That is worth saying before it happens, not after.
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 9 })] }) });

    open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this pass' }));

    expect(screen.getByText(/takes Hollow Knight off your board/)).toBeInTheDocument();
  });

  it('closes once the last pass is gone', async () => {
    journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 9 })] }) });

    const { onClose } = open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this pass' }));
    await userEvent.click(screen.getByRole('button', { name: 'Really delete?' }));

    // There is nothing left for it to show, and the card behind it has gone too.
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('says so when a delete fails rather than looking like it worked', async () => {
    journalServer({
      detail: gameDetail({ logEntries: [logEntry({ id: 9 })] }),
      deleteStatus: 404,
    });

    const { onClose } = open();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete this pass' }));
    await userEvent.click(screen.getByRole('button', { name: 'Really delete?' }));

    expect(await screen.findByText('That pass is already gone.')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('records how long a pass took, and sends it', async () => {
    const journal = journalServer({
      detail: gameDetail({ logEntries: [logEntry({ id: 7, status: 'Completed' })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('Hours played'), '31.5');
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body['hoursPlayed']).toBe(31.5);
  });

  it('refuses hours the column would round, without asking the server', async () => {
    const journal = journalServer();

    open();
    await userEvent.type(await screen.findByLabelText('Hours played'), '12.345');
    await userEvent.click(save());

    expect(await screen.findByRole('alert')).toHaveTextContent(/two decimal places/);
    expect(journal.saved).toHaveLength(0);
  });


  it('shows what an earlier pass took, alongside what it was rated', async () => {
    journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({ id: 9, status: 'InProgress' }),
          logEntry({
            id: 7,
            status: 'Completed',
            rating: 9.6,
            hoursPlayed: 42.5,
            completedAt: '2024-11-02T18:00:00+00:00',
          }),
        ],
      }),
    });

    open();

    const pass = await screen.findByRole('region', { name: 'Completed Nov 2, 2024' });
    expect(within(pass).getByText('42.5 h')).toBeInTheDocument();
  });

  it('says there is no HowLongToBeat estimate yet rather than showing nothing', async () => {
    // The column has been on the wire since the schema shipped and null on every row. Saying so
    // is the honest state until the HowLongToBeat pass fills it in.
    journalServer({
      detail: gameDetail({ hltbMainStoryHours: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();

    expect(await screen.findByText(/No HowLongToBeat estimate yet/)).toBeInTheDocument();
  });

  it("shows the headline figure and all three of HowLongToBeat's tiers", async () => {
    journalServer({
      detail: gameDetail({
        hltbAllStylesHours: 41.82,
        hltbMainStoryHours: 27,
        hltbMainExtraHours: 41.59,
        hltbCompletionistHours: 65.6,
        logEntries: [logEntry({ id: 7 })],
      }),
    });

    open();

    // Each tier is asserted as a *pair* rather than as one string, which is the whole of what
    // changed here. They used to be four spans reading "Main story: 27 h", and four spans in a
    // wrapping flex row is a layout that comes apart at exactly one width: the drawer's, where
    // three fitted and Completionist dropped to a second line under nothing in particular. A
    // name and its number now share a grid cell, so a reflow moves the pair or neither.
    const tier = async (label: string) => (await screen.findByText(label)).closest('div')!;

    // The headline first: it is the figure the site leads with and the one the card carries.
    expect(within(await tier('All play styles')).getByText('41.82 h')).toBeInTheDocument();
    expect(within(await tier('Main story')).getByText('27 h')).toBeInTheDocument();
    expect(within(await tier('Main + Extra')).getByText('41.59 h')).toBeInTheDocument();
    expect(within(await tier('Completionist')).getByText('65.6 h')).toBeInTheDocument();
  });

  it('leaves out a tier nobody has submitted a time for, rather than showing a gap', async () => {
    // An obscure title with a main-story time and nothing else is ordinary. Printing
    // "Completionist: —" would make that read as a broken row rather than as missing data.
    journalServer({
      detail: gameDetail({
        hltbMainStoryHours: 27,
        hltbMainExtraHours: null,
        hltbCompletionistHours: null,
        logEntries: [logEntry({ id: 7 })],
      }),
    });

    open();

    expect(await screen.findByText('Main story')).toBeInTheDocument();
    expect(screen.queryByText(/Completionist/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No HowLongToBeat estimate yet/)).not.toBeInTheDocument();
  });

  it('puts your hours next to the headline figure, and the difference between them', async () => {
    // Against All play styles rather than Main story, which is what this compared to first. It
    // followed the card and the Time to beat sort there, and it is the better comparison
    // anyway: a completionist run held up against main story reads as wildly over, when it is
    // only over for a tier it was never doing.
    journalServer({
      detail: gameDetail({
        hltbAllStylesHours: 24.5,
        hltbMainStoryHours: 18,
        logEntries: [logEntry({ id: 7, hoursPlayed: 31 })],
      }),
    });

    open();

    expect(await screen.findByText('All play styles')).toBeInTheDocument();
    expect(screen.getByText('24.5 h')).toBeInTheDocument();
    expect(screen.getByText(/you: 31 h/)).toBeInTheDocument();
    expect(screen.getByText(/\+6.5/)).toBeInTheDocument();
  });

  it('offers the pinned HowLongToBeat id, and a link to check it against', async () => {
    // Following the link is how you find out whether the matcher picked the game you meant,
    // and it is why no column stores the matched title: HowLongToBeat's name for a game is
    // often not IGDB's, so storing it would let a lookup rename a card.
    journalServer({
      detail: gameDetail({ hltbId: 9134, logEntries: [logEntry({ id: 7 })] }),
    });

    open();

    expect(await screen.findByLabelText('HowLongToBeat ID')).toHaveValue('9134');
    expect(screen.getByRole('link', { name: 'View on HowLongToBeat' })).toHaveAttribute(
      'href',
      'https://howlongtobeat.com/game/9134',
    );
  });

  it('has nothing to link to before anything has matched', async () => {
    journalServer({
      detail: gameDetail({ hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();

    expect(await screen.findByLabelText('HowLongToBeat ID')).toHaveValue('');
    expect(screen.queryByRole('link', { name: 'View on HowLongToBeat' })).not.toBeInTheDocument();
  });

  it('pins the id against the game, not the pass', async () => {
    // A property of the title, exactly like the genre beside it — and the form below submits
    // one PUT to the log-entry endpoint, so putting this in it would mean writing to two.
    const journal = journalServer({
      detail: gameDetail({ id: 3003, hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '9134');
    await userEvent.tab();

    await waitFor(() => expect(journal.pinned).toHaveLength(1));
    expect(journal.pinned[0]).toEqual({ mediaId: 3003, hltbId: 9134 });
  });

  it('waits for the number to be finished rather than pinning every keystroke', async () => {
    // The genre select saves on change because a choice from a list is complete when it is
    // made. A number is not: "9134" passes through 9, 91 and 913 on the way, and this is the
    // one route that fetches HowLongToBeat while the caller waits — four pins would be four
    // upstream lookups, three of them for ids nobody asked about.
    const journal = journalServer({
      detail: gameDetail({ hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '9134');

    expect(journal.pinned).toHaveLength(0);
  });

  it('does not re-ask about an id that was only looked at', async () => {
    // Tabbing through the drawer must not re-pin what is already pinned. The pin re-fetches,
    // so an unchanged value going back would be seconds of upstream work to learn nothing.
    const journal = journalServer({
      detail: gameDetail({ hltbId: 9134, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.click(await screen.findByLabelText('HowLongToBeat ID'));
    await userEvent.tab();

    expect(journal.pinned).toHaveLength(0);
  });

  it('clears the pin when the box is emptied', async () => {
    // Not the same as never having asked and not the same as a zero: null here means forget
    // the id, which puts the title back in the way of the next backfill.
    const journal = journalServer({
      detail: gameDetail({ id: 3003, hltbId: 9134, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.clear(await screen.findByLabelText('HowLongToBeat ID'));
    await userEvent.tab();

    await waitFor(() => expect(journal.pinned).toHaveLength(1));
    expect(journal.pinned[0]).toEqual({ mediaId: 3003, hltbId: null });
  });

  it('pins on Enter without having to tab away', async () => {
    const journal = journalServer({
      detail: gameDetail({ id: 3003, hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '9134{Enter}');

    await waitFor(() => expect(journal.pinned).toHaveLength(1));
    // Still exactly one after everything settles. This is the path where the box is still
    // focused as it disables, which a real browser turns into a second blur — see the guard in
    // HltbPin. jsdom cannot reproduce that, so this asserts the intent rather than proving it.
    await waitFor(() => expect(screen.getByLabelText('HowLongToBeat ID')).toBeEnabled());
    expect(journal.pinned).toEqual([{ mediaId: 3003, hltbId: 9134 }]);
  });

  it('says so when HowLongToBeat does not know the id', async () => {
    // The reason the pin fetches while you wait: an id typed wrong comes back as a refusal
    // naming it, rather than as a stored pin that quietly answers nothing for ever.
    journalServer({
      detail: gameDetail({ hltbId: null, logEntries: [logEntry({ id: 7 })] }),
      pinErrors: { hltbId: ['HowLongToBeat has no game 999999.'] },
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '999999');
    await userEvent.tab();

    expect(await screen.findByText('HowLongToBeat has no game 999999.')).toBeInTheDocument();
    // And what was typed stays put, because correcting it is the next thing you would do.
    expect(screen.getByLabelText('HowLongToBeat ID')).toHaveValue('999999');
  });

  it('asks once, however the box loses focus on the way', async () => {
    // The box disables itself while the server is reading HowLongToBeat, and an element being
    // disabled is a blur — which is the same event that commits. Without a guard the commit
    // fires again on a value the stored id has not caught up with yet, and one pin becomes two
    // upstream lookups.
    const journal = journalServer({
      detail: gameDetail({ id: 3003, hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '9134');
    await userEvent.tab();

    await waitFor(() => expect(journal.pinned).toHaveLength(1));
    // Let everything that was going to happen happen, then check nothing else did.
    await waitFor(() => expect(screen.getByLabelText('HowLongToBeat ID')).toBeEnabled());
    expect(journal.pinned).toEqual([{ mediaId: 3003, hltbId: 9134 }]);
  });

  it('refuses what is not an id without asking HowLongToBeat about it', async () => {
    // There is nothing to learn from asking, and the pin is the one route that holds the
    // caller while the server reads a website. The rule mirrors the Range on the server.
    const journal = journalServer({
      detail: gameDetail({ hltbId: null, logEntries: [logEntry({ id: 7 })] }),
    });

    open();
    await userEvent.type(await screen.findByLabelText('HowLongToBeat ID'), '12.5');
    await userEvent.tab();

    expect(await screen.findByText(/whole number/)).toBeInTheDocument();
    expect(journal.pinned).toHaveLength(0);
  });

  it('offers the game genres, and an automatic option naming what it would pick', async () => {
    // Naming the automatic pick is what makes the blank option mean something. "Not recorded"
    // would be a lie: null here means "use the automatic one", not "no genre".
    journalServer({
      detail: gameDetail({
        genres: ['Adventure', 'Indie', 'Platform'],
        primaryGenre: null,
        logEntries: [logEntry({ id: 7 })],
      }),
    });

    open();

    const select = await screen.findByLabelText('Genre');
    expect(select).toHaveValue('');
    expect(
      within(select).getByRole('option', { name: 'Automatic — Platform' }),
    ).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Adventure' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'Indie' })).toBeInTheDocument();
  });

  it('says the automatic pick is none when it does not paint any of them', async () => {
    journalServer({
      detail: gameDetail({ genres: ['Indie'], primaryGenre: null, logEntries: [logEntry()] }),
    });

    open();

    expect(
      within(await screen.findByLabelText('Genre')).getByRole('option', {
        name: 'Automatic — none',
      }),
    ).toBeInTheDocument();
  });

  it('keeps a chosen genre the game no longer lists', async () => {
    journalServer({
      detail: gameDetail({
        genres: ['Platform'],
        primaryGenre: 'Metroidvania',
        logEntries: [logEntry()],
      }),
    });

    open();

    expect(await screen.findByLabelText('Genre')).toHaveValue('Metroidvania');
  });

  it('writes the genre against the game, not the pass', async () => {
    // A property of the title: what kind of game it is does not change between playthroughs
    // the way the platform you played it on does. So it saves on its own, not with the form.
    const journal = journalServer({
      detail: gameDetail({
        id: 3003,
        genres: ['Adventure', 'Platform'],
        primaryGenre: null,
        logEntries: [logEntry({ id: 7 })],
      }),
    });

    open();
    await userEvent.selectOptions(await screen.findByLabelText('Genre'), 'Adventure');

    await waitFor(() => expect(journal.genresSet).toHaveLength(1));
    expect(journal.genresSet[0]).toEqual({ mediaId: 3003, genre: 'Adventure' });
  });

  describe('the wheel', () => {
    // Up is more and down is less, which is the one thing a person will assume without being
    // told. `deltaY` is negative for a wheel pushed away, so the sign is inverted on the way in.
    const up = { deltaY: -100 };
    const down = { deltaY: 100 };

    async function openRated(value: number | null = 8) {
      journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7, rating: value })] }) });
      open();
      await screen.findByRole('slider', { name: 'Rating' });
    }

    it('steps the rating a whole point on the slider', async () => {
      // A whole point on the bar and a tenth in the box, which is the split the two controls
      // already carry: the slider is for finding roughly where a game sits and the box is for
      // saying exactly. One notch of the wheel should mean what one control is for.
      await openRated(8);

      fireEvent.wheel(slider(), up);
      expect(rating()).toHaveValue(9);

      fireEvent.wheel(slider(), down);
      fireEvent.wheel(slider(), down);
      expect(rating()).toHaveValue(7);
    });

    it('steps the rating a tenth on the box', async () => {
      await openRated(8);

      fireEvent.wheel(rating(), up);
      expect(rating()).toHaveValue(8.1);

      fireEvent.wheel(rating(), down);
      fireEvent.wheel(rating(), down);
      expect(rating()).toHaveValue(7.9);
    });

    it('cannot be scrolled past either end of the scale', async () => {
      // The column is numeric(3,1) checked to 1.0-10.0, so a wheel that ran past the end would
      // be building a 400 rather than a rating.
      await openRated(9.5);

      fireEvent.wheel(slider(), up);
      expect(rating()).toHaveValue(10);
      fireEvent.wheel(slider(), up);
      expect(rating()).toHaveValue(10);
    });

    it('starts an unrated pass from the bottom of the scale rather than from nothing', async () => {
      // The handle is parked at 1 while nothing is rated, so that is where a wheel picks up
      // from — and either direction commits to a rating, because scrolling a slider is not
      // something you do by accident. Clear is one button away.
      await openRated(null);
      expect(rating()).toHaveValue(null);

      fireEvent.wheel(slider(), up);
      expect(rating()).toHaveValue(2);
    });

    it('takes the confirmation back, as typing into a field does', async () => {
      // The form hears every field through one `onChange` on the <form>, and React raises that
      // from real DOM events. A wheel sets state directly, so nothing reaches it — which would
      // leave "Saved" standing beside a rating that is no longer the one the server has. The
      // step handlers call onEdit themselves for exactly this.
      journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7, rating: 8 })] }) });

      open();
      await userEvent.click(await screen.findByRole('button', { name: 'Save' }));
      expect(await screen.findByRole('status')).toHaveTextContent('Saved');

      fireEvent.wheel(slider(), up);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('steps hours played by half an hour, and never down to nothing', async () => {
      // Half an hour, because that is the grain anybody records a session in. It stops above
      // zero rather than at it: the column refuses 0, so a wheel that reached it would be
      // producing a value the save is going to bounce.
      journalServer({
        detail: gameDetail({ logEntries: [logEntry({ id: 7, hoursPlayed: 1 })] }),
      });
      open();

      const hours = await screen.findByRole('spinbutton', { name: 'Hours played' });

      fireEvent.wheel(hours, up);
      expect(hours).toHaveValue(1.5);

      fireEvent.wheel(hours, down);
      fireEvent.wheel(hours, down);
      expect(hours).toHaveValue(0.5);

      fireEvent.wheel(hours, down);
      expect(hours).toHaveValue(0.5);
    });
  });

  it('names the developer under the title, and leaves the platforms to the field that sets one', async () => {
    // This line was the game's whole byline once, so it carried both. The platforms have a
    // control of their own three rows down, and a list of them under the title said nothing you
    // could act on — a spec sheet where a byline belongs. Who made it is the fact that does not
    // appear anywhere else in the drawer.
    journalServer({
      detail: gameDetail({ platforms: ['PC', 'Switch'], developers: ['Team Cherry'] }),
    });

    open();

    expect(await screen.findByText('Team Cherry')).toBeInTheDocument();
    // The words still exist as options in the Platform select; what is gone is the joined line.
    expect(screen.queryByText(/PC, Switch/)).not.toBeInTheDocument();
  });

  it('offers the platforms the game came out on, and no platform at all', async () => {
    // Already loaded by getGame, so there is no second request to make for this.
    journalServer({ detail: gameDetail({ platforms: ['PC', 'Switch'] }) });

    open();

    const platform = await screen.findByRole('combobox', { name: 'Platform' });
    expect([...platform.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      'Not recorded',
      'PC',
      'Switch',
    ]);
  });

  it('keeps a platform the game no longer lists', async () => {
    // IGDB's data changes. Dropping a value that was true when it was written, on a save the
    // reader made about something else entirely, is not a correction.
    journalServer({
      detail: gameDetail({
        platforms: ['PC', 'Switch'],
        logEntries: [logEntry({ id: 9, platform: 'Wii U' })],
      }),
    });

    open();

    expect(await screen.findByRole('combobox', { name: 'Platform' })).toHaveValue('Wii U');
  });

  it('sends the platform you chose', async () => {
    const journal = journalServer({ detail: gameDetail({ platforms: ['PC', 'Switch'] }) });

    open();
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Platform' }),
      'Switch',
    );
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved[0]?.body['platform']).toBe('Switch'));
  });

  it("lists a pass's notes newest first, with the time of day", async () => {
    // The API orders them and the drawer does not re-sort. The time is the part of a journal
    // worth reading back — "beat it at 9:30pm" is the entry; the date alone is a filing label.
    journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({
            id: 7,
            notes: [
              note({ id: 9, body: 'finally beat radiance' }),
              note({
                id: 8,
                body: 'stuck on watcher knights',
                writtenAt: '2026-08-19T23:02:00+00:00',
              }),
            ],
          }),
        ],
      }),
    });

    open();

    expect(await screen.findByText('Aug 20, 2026, 9:30 PM')).toBeInTheDocument();

    const written = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
    expect(written[0]).toContain('finally beat radiance');
    expect(written[1]).toContain('stuck on watcher knights');
  });

  it('writes a note against the pass it was typed under', async () => {
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    await userEvent.type(await screen.findByRole('textbox', { name: 'New note' }), 'radiance');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));

    await waitFor(() => expect(journal.written).toEqual([{ entryId: 7, body: 'radiance' }]));
    // Cleared, or the next note starts with the last one still in the box.
    expect(screen.getByRole('textbox', { name: 'New note' })).toHaveValue('');
  });

  it('sends a note on Enter, and makes a line on Shift+Enter', async () => {
    // The convention every compose box carries, and worth having here for the reason it exists
    // there: a journal entry is usually one line, so reaching for the button is a gesture per
    // thought. Shift+Enter is what keeps the multi-line note writable — the body is stored
    // whitespace-preserved and rendered that way, so the lines are a real thing to want.
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    const box = await screen.findByRole('textbox', { name: 'New note' });

    await userEvent.type(box, 'watcher knights{Shift>}{Enter}{/Shift}on the second try');
    expect(journal.written).toEqual([]);
    expect(box).toHaveValue('watcher knights\non the second try');

    await userEvent.type(box, '{Enter}');

    await waitFor(() =>
      expect(journal.written).toEqual([
        { entryId: 7, body: 'watcher knights\non the second try' },
      ]),
    );
    // Cleared, exactly as the button leaves it. Two ways in, one ending.
    expect(box).toHaveValue('');
  });

  it('sends a rewrite on Enter, and makes a line on Shift+Enter', async () => {
    // The same box doing the same job, so it answers the same key. This is the arguable half —
    // an edit box is where Enter is likeliest to be reached for out of habit mid-thought — and
    // it is one line in `sendOnEnter`'s two call sites to take back.
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, notes: [note({ id: 9, body: 'wathcer knights' })] })],
      }),
    });

    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit the note from Aug 20, 2026, 9:30 PM' }),
    );

    const box = screen.getByRole('textbox', { name: 'Note from Aug 20, 2026, 9:30 PM' });
    await userEvent.clear(box);
    await userEvent.type(box, 'watcher knights{Shift>}{Enter}{/Shift}on the second try');
    expect(journal.rewritten).toEqual([]);

    await userEvent.type(box, '{Enter}');

    await waitFor(() =>
      expect(journal.rewritten).toEqual([
        { id: 9, body: 'watcher knights\non the second try' },
      ]),
    );
  });

  it('sends nothing on the Enter that accepts an IME candidate', async () => {
    // An input method reports the Enter that chooses a candidate as an ordinary key press, so
    // without the guard a note typed in Japanese or Korean is sent halfway through its first
    // word — and the half that was sent is a note, not a draft. `isComposing` is the only thing
    // that tells the two apart.
    //
    // fireEvent rather than userEvent, because nothing in the typing API raises a composing
    // key. And the note is finished afterwards rather than asserted on the spot: if the guard
    // were missing, the first Enter would send and clear, the second would find an empty box
    // and correctly send nothing, and a test that only counted the writes at the end would see
    // one either way. What separates them is *which* note arrived.
    const journal = journalServer({ detail: gameDetail({ logEntries: [logEntry({ id: 7 })] }) });

    open();
    const box = await screen.findByRole('textbox', { name: 'New note' });
    await userEvent.type(box, 'radiance');

    fireEvent.keyDown(box, { key: 'Enter', isComposing: true });

    await userEvent.type(box, ' at last{Enter}');

    await waitFor(() => expect(journal.written).toHaveLength(1));
    expect(journal.written[0]?.body).toBe('radiance at last');
  });

  it('sends nothing on Enter from a box with only whitespace in it', async () => {
    // Both boxes already refuse an empty body — the compose box in `write`, the edit box only
    // through its button's `disabled`. A key press consults no button, so the edit box needed
    // the guard moved somewhere the keyboard reaches it; without that, Enter is a way past a
    // disabled control and into a 400 the API answers with "A note needs something in it".
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, notes: [note({ id: 9, body: 'wathcer knights' })] })],
      }),
    });

    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit the note from Aug 20, 2026, 9:30 PM' }),
    );

    const box = screen.getByRole('textbox', { name: 'Note from Aug 20, 2026, 9:30 PM' });
    await userEvent.clear(box);
    await userEvent.type(box, '   {Enter}');

    expect(journal.rewritten).toEqual([]);
    // Still open. A rewrite closes the editor, so this is how "nothing was sent" is visible.
    expect(box).toBeInTheDocument();
  });

  it('rewrites a note', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, notes: [note({ id: 9, body: 'wathcer knights' })] })],
      }),
    });

    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Edit the note from Aug 20, 2026, 9:30 PM' }),
    );

    const box = screen.getByRole('textbox', { name: 'Note from Aug 20, 2026, 9:30 PM' });
    await userEvent.clear(box);
    await userEvent.type(box, 'watcher knights');
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }));

    await waitFor(() => expect(journal.rewritten).toEqual([{ id: 9, body: 'watcher knights' }]));
  });

  it('asks before deleting a note', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, notes: [note({ id: 9 })] })],
      }),
    });

    open();
    await userEvent.click(
      await screen.findByRole('button', { name: 'Delete the note from Aug 20, 2026, 9:30 PM' }),
    );

    expect(journal.dropped).toEqual([]);

    await userEvent.click(screen.getByRole('button', { name: 'Really delete?' }));
    await waitFor(() => expect(journal.dropped).toEqual([9]));
  });

  it("reads an earlier pass's notes, and can still add to it", async () => {
    // Remembering something later about a playthrough that is over is a real thing to want. The
    // box is a click away rather than open, or the history is a column of identical write boxes.
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [
          logEntry({ id: 9, status: 'InProgress' }),
          logEntry({
            id: 7,
            status: 'Completed',
            completedAt: '2024-11-02T18:00:00+00:00',
            notes: [note({ id: 4, body: 'what a finish' })],
          }),
        ],
      }),
    });

    open();

    const finished = within(await screen.findByRole('region', { name: 'Completed Nov 2, 2024' }));
    expect(finished.getByText('what a finish')).toBeInTheDocument();

    await userEvent.click(finished.getByRole('button', { name: 'Add a note' }));
    await userEvent.type(finished.getByRole('textbox', { name: 'New note' }), 'remembered later');
    await userEvent.click(finished.getByRole('button', { name: 'Add note' }));

    await waitFor(() =>
      expect(journal.written).toEqual([{ entryId: 7, body: 'remembered later' }]),
    );
  });
});

/**
 * The same drawer, opened on a film.
 *
 * Its own describe rather than cases threaded through the one above, because almost nothing
 * here is a variation on a games assertion — three of the pass's six fields are *absent*, which
 * is not something the games cases have an opinion about.
 *
 * `movieJournalServer` deliberately does not answer `/api/games/:id`, so a drawer that still
 * fetched a game whatever it was opened on fails these as unhandled requests rather than
 * quietly serving Hollow Knight under a film's title.
 */
describe('EntryDrawer, on a film', () => {
  function openFilm(mediaId = 4004, onClose = vi.fn()) {
    return {
      onClose,
      ...renderWithProviders(<EntryDrawer hobby="movies" mediaId={mediaId} onClose={onClose} />),
    };
  }

  it('bylines the director, where a game bylines the developer', async () => {
    movieJournalServer({
      detail: movieDetail({ title: 'Arrival', directors: ['Denis Villeneuve'] }),
    });

    openFilm();

    expect(await screen.findByRole('heading', { name: 'Arrival' })).toBeInTheDocument();
    expect(screen.getByText('Denis Villeneuve')).toBeInTheDocument();
  });

  it('calls the pass what a film in that column is called', async () => {
    // InProgress is the protocol and Watching is the label. A film in a band headed Playing is
    // the first thing anybody would notice, and the drawer kept its own copy of those labels
    // until there was a second hobby to disagree with it.
    movieJournalServer({
      detail: movieDetail({ logEntries: [logEntry({ id: 7, status: 'InProgress' })] }),
    });

    openFilm();

    expect(await screen.findByRole('region', { name: 'Watching' })).toBeInTheDocument();
  });

  it('names an earlier pass by the column it ended in', async () => {
    movieJournalServer({
      detail: movieDetail({
        logEntries: [
          logEntry({ id: 9, status: 'InProgress' }),
          logEntry({ id: 7, status: 'Completed', completedAt: '2024-11-02T18:00:00+00:00' }),
        ],
      }),
    });

    openFilm();

    expect(await screen.findByRole('region', { name: 'Watched Nov 2, 2024' })).toBeInTheDocument();
  });

  it('has no hours box and no platform select, because a film has neither', async () => {
    // Absent rather than relabelled, which was a decision and not an omission: "your time" on a
    // film is the runtime, and what it was watched on is not worth a control.
    movieJournalServer();

    openFilm();

    await screen.findByRole('heading', { name: 'Arrival' });
    expect(screen.queryByLabelText('Hours played')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Platform')).not.toBeInTheDocument();
    expect(screen.queryByText('No HowLongToBeat estimate yet')).not.toBeInTheDocument();
  });

  it('names the finished date what the column is named', async () => {
    // The date is stamped by the move into that column, so it takes the column's word for it —
    // Completed for a game, Watched for a film. Rating and the two dates are all that is left.
    movieJournalServer();

    openFilm();

    expect(await screen.findByLabelText('Watched')).toBeInTheDocument();
    expect(screen.getByLabelText('Started')).toBeInTheDocument();
    expect(screen.queryByLabelText('Completed')).not.toBeInTheDocument();
  });

  it('offers no HowLongToBeat pin', async () => {
    movieJournalServer();

    openFilm();

    await screen.findByRole('heading', { name: 'Arrival' });
    expect(screen.queryByLabelText('HowLongToBeat ID')).not.toBeInTheDocument();
  });

  it('states the runtime with the film rather than with the pass', async () => {
    // The four HowLongToBeat figures sit beside your own hours because comparing them is the
    // entire point. A film has nothing to compare against, so its runtime is a fact about the
    // film like the director is — and it belongs in the band that holds those.
    movieJournalServer({ detail: movieDetail({ runtimeMinutes: 116 }) });

    openFilm();

    expect(await screen.findByText('Runtime')).toBeInTheDocument();
    expect(screen.getByText('1 h 56 m')).toBeInTheDocument();

    const pass = within(screen.getByRole('region', { name: 'Watching' }));
    expect(pass.queryByText('1 h 56 m')).not.toBeInTheDocument();
  });

  it('says nothing about a runtime TMDB does not have', async () => {
    movieJournalServer({ detail: movieDetail({ runtimeMinutes: null }) });

    openFilm();

    await screen.findByRole('heading', { name: 'Arrival' });
    expect(screen.queryByText('Runtime')).not.toBeInTheDocument();
  });

  it('sends a pass with no hours and no platform, which is what clears them', async () => {
    // PUT, so an absent field is a cleared one — and a film's pass is never meant to hold
    // either. The form has no control for them, so this is the only place it could go wrong.
    const journal = movieJournalServer({
      detail: movieDetail({ logEntries: [logEntry({ id: 7, status: 'InProgress' })] }),
    });

    openFilm();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Exact rating' }), '9');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body).toEqual({
      status: 'InProgress',
      rating: 9,
      platform: null,
      hoursPlayed: null,
      startedAt: null,
      completedAt: null,
      seasonNumber: null,
      episodeNumber: null,
    });
  });

  it('picks the genre off the film list, and writes it to the films route', async () => {
    // TMDB's vocabulary and IGDB's overlap barely at all, so a select populated from the games
    // list would offer a film nothing it has. The automatic option names the pick the board is
    // already painting with, which is Science Fiction here and not Drama — specific first.
    const journal = movieJournalServer({
      detail: movieDetail({ genres: ['Drama', 'Science Fiction'] }),
    });

    openFilm();

    const genre = await screen.findByRole('combobox', { name: 'Genre' });
    expect(within(genre).getByRole('option', { name: /Automatic/ })).toHaveTextContent(
      'Automatic — Science Fiction',
    );

    await userEvent.selectOptions(genre, 'Drama');

    await waitFor(() => expect(journal.genresSet).toEqual([{ mediaId: 4004, genre: 'Drama' }]));
  });
});

/**
 * The same drawer again, opened on a show.
 *
 * Its own describe for the films block's reason, and one thing more: a show is the only hobby
 * whose pass says where you are *inside* the title, so the two dropdowns here have no
 * counterpart above. `tvJournalServer` answers `/api/tv/:id` and nothing else, so a drawer that
 * dispatched to films would fail as an unhandled request rather than showing Arrival.
 */
describe('EntryDrawer, on a show', () => {
  function openShow(mediaId = 5005, onClose = vi.fn()) {
    return {
      onClose,
      ...renderWithProviders(<EntryDrawer hobby="tv" mediaId={mediaId} onClose={onClose} />),
    };
  }

  const season = () => screen.getByLabelText('Season');
  const episode = () => screen.getByLabelText('Episode');

  it('bylines the creator, and states the run, the airing and one episode', async () => {
    tvJournalServer({ detail: tvShowDetail({ title: 'Severance' }) });

    openShow();

    expect(await screen.findByRole('heading', { name: 'Severance' })).toBeInTheDocument();
    expect(screen.getByText('Dan Erickson')).toBeInTheDocument();
    expect(screen.getByText('2 seasons \u00b7 19 episodes')).toBeInTheDocument();
    expect(screen.getByText('Returning Series \u00b7 2022\u2013')).toBeInTheDocument();
    expect(screen.getByText('47 m')).toBeInTheDocument();
  });

  it('offers every season TMDB knows, Specials included', async () => {
    // Season 0 is a real season with a `>= 0` constraint behind it, and the list is what makes
    // that honest — it says Specials rather than 0, which is what anybody watching calls it.
    tvJournalServer();

    openShow();

    await screen.findByRole('heading', { name: 'Severance' });
    expect(within(season()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Not recorded',
      'Specials',
      'Season 1',
      'Season 2',
    ]);
  });

  it('re-sizes the episode list to the season that was chosen', async () => {
    // The reason the drawer loads seasons at all. Nine against ten against three: a dropdown
    // built from the show's total would offer episode 19 of a season that has nine.
    tvJournalServer();

    openShow();
    await screen.findByRole('heading', { name: 'Severance' });

    await userEvent.selectOptions(season(), '1');
    expect(within(episode()).getAllByRole('option')).toHaveLength(10);

    await userEvent.selectOptions(season(), '2');
    expect(within(episode()).getAllByRole('option')).toHaveLength(11);

    await userEvent.selectOptions(season(), '0');
    expect(within(episode()).getAllByRole('option')).toHaveLength(4);
  });

  it('clears the episode when the season changes under it', async () => {
    // S1 E9 and then a switch to Specials leaves a value the dropdown cannot show. Clamping to
    // the last episode of the new season would be inventing a claim nobody made; clearing says
    // the honest thing, which is that where you are is no longer known.
    tvJournalServer();

    openShow();
    await screen.findByRole('heading', { name: 'Severance' });

    await userEvent.selectOptions(season(), '1');
    await userEvent.selectOptions(episode(), '9');
    expect(episode()).toHaveValue('9');

    await userEvent.selectOptions(season(), '0');
    expect(episode()).toHaveValue('');
  });

  it('offers no episode at all until a season says which ones there are', async () => {
    // Not disabled: an empty list is the same statement and needs no second rule. It is also
    // what keeps the pair the API refuses out of reach — an episode with no season.
    tvJournalServer();

    openShow();
    await screen.findByRole('heading', { name: 'Severance' });

    expect(within(episode()).getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Not recorded',
    ]);
  });

  it('sends the season and the episode with the rest of the pass', async () => {
    const journal = tvJournalServer({
      detail: tvShowDetail({ logEntries: [logEntry({ id: 7, status: 'InProgress' })] }),
    });

    openShow();
    await screen.findByRole('heading', { name: 'Severance' });

    await userEvent.selectOptions(season(), '2');
    await userEvent.selectOptions(episode(), '4');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.body).toEqual({
      status: 'InProgress',
      rating: null,
      platform: null,
      hoursPlayed: null,
      startedAt: null,
      completedAt: null,
      seasonNumber: 2,
      episodeNumber: 4,
    });
  });

  it('fills both dropdowns from the pass the board is showing', async () => {
    // entrySeed's job. The form is keyed on the values it was seeded from, so a field left out
    // of that key is one a refetch cannot correct on screen — which is the bug that made a game
    // dragged to Playing keep showing an empty Started.
    tvJournalServer({
      detail: tvShowDetail({
        logEntries: [logEntry({ id: 7, seasonNumber: 2, episodeNumber: 4 })],
      }),
    });

    openShow();

    await screen.findByRole('heading', { name: 'Severance' });
    expect(season()).toHaveValue('2');
    expect(episode()).toHaveValue('4');
  });

  it('keeps a stored season the show has stopped listing', async () => {
    // The platform select's rule, on a list that moves for a different reason: TMDB restructures
    // a show's seasons and a pass that named one is still a true thing somebody wrote down.
    tvJournalServer({
      detail: tvShowDetail({
        seasons: [{ seasonNumber: 1, name: 'Season 1', episodeCount: 9 }],
        logEntries: [logEntry({ id: 7, seasonNumber: 4, episodeNumber: 2 })],
      }),
    });

    openShow();

    await screen.findByRole('heading', { name: 'Severance' });
    expect(season()).toHaveValue('4');
    expect(episode()).toHaveValue('2');
  });

  it('has no hours box and no platform select, exactly as a film has neither', async () => {
    tvJournalServer();

    openShow();

    await screen.findByRole('heading', { name: 'Severance' });
    expect(screen.queryByLabelText('Hours played')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Platform')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('HowLongToBeat ID')).not.toBeInTheDocument();
  });

  it('refuses an episode with no season, before the API has to', async () => {
    // Unreachable through the dropdowns and checked anyway, beside the completed-before-started
    // rule and for its reason: the server states it too, before the check constraint can turn
    // it into a 500. A pass that arrived in this shape can still be saved out of it.
    const journal = tvJournalServer({
      detail: tvShowDetail({
        logEntries: [logEntry({ id: 7, seasonNumber: null, episodeNumber: 7 })],
      }),
    });

    openShow();
    await screen.findByRole('heading', { name: 'Severance' });
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An episode needs a season.');
    expect(journal.saved).toHaveLength(0);
  });

  it('picks the genre off the television list, which is not the film one', async () => {
    // Same provider, two vocabularies. TMDB television list folds science fiction into fantasy,
    // so a select populated from the films list would offer this show a word it does not have
    // and miss the one it does. Sci-Fi & Fantasy is the automatic pick over Mystery and Drama
    // because the list is ordered specific before generic.
    const journal = tvJournalServer({
      detail: tvShowDetail({ genres: ['Drama', 'Mystery', 'Sci-Fi & Fantasy'] }),
    });

    openShow();

    const genre = await screen.findByRole('combobox', { name: 'Genre' });
    expect(within(genre).getByRole('option', { name: /Automatic/ })).toHaveTextContent(
      'Automatic \u2014 Sci-Fi & Fantasy',
    );

    await userEvent.selectOptions(genre, 'Drama');

    await waitFor(() => expect(journal.genresSet).toEqual([{ mediaId: 5005, genre: 'Drama' }]));
  });
});
