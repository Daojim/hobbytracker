import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EntryDrawer } from './EntryDrawer';
import { gameDetail, journalServer, logEntry, note } from '../test/games';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';

const rating = () => screen.getByRole('spinbutton', { name: 'Exact rating' });
const slider = () => screen.getByRole('slider', { name: 'Rating' });
const started = () => screen.getByLabelText('Started');
const save = () => screen.getByRole('button', { name: 'Save' });

function open(mediaId = 3003, onClose = vi.fn()) {
  return { onClose, ...renderWithProviders(<EntryDrawer mediaId={mediaId} onClose={onClose} />) };
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
      await queryClient.invalidateQueries({ queryKey: ['games', 3003] });
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

  it('shows the headline figure and all three of HowLongToBeat\'s tiers', async () => {
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

  // The headline first: it is the figure the site leads with and the one the card carries.
  expect(await screen.findByText('All play styles: 41.82 h')).toBeInTheDocument();
  expect(screen.getByText('Main story: 27 h')).toBeInTheDocument();
  expect(screen.getByText('Main + Extra: 41.59 h')).toBeInTheDocument();
  expect(screen.getByText('Completionist: 65.6 h')).toBeInTheDocument();
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

  expect(await screen.findByText('Main story: 27 h')).toBeInTheDocument();
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

    expect(await screen.findByText(/All play styles: 24.5 h/)).toBeInTheDocument();
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
