import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { EntryDrawer } from './EntryDrawer';
import { gameDetail, journalServer, logEntry } from '../test/games';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';

const rating = () => screen.getByRole('spinbutton', { name: 'Rating' });
const notes = () => screen.getByRole('textbox', { name: 'Notes' });
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
            notes: 'hard but fair',
            startedAt: '2026-08-21T01:30:00+00:00',
          }),
        ],
      }),
    });

    open();

    expect(await screen.findByRole('heading', { name: 'Celeste' })).toBeInTheDocument();
    expect(rating()).toHaveValue(8.5);
    expect(notes()).toHaveValue('hard but fair');
    // 01:30 UTC is the evening before here, and the input has to agree with the card.
    expect(started()).toHaveValue('2026-08-20');
  });

  it('sends every field, because an omitted one is a cleared one', async () => {
    // The API takes PUT rather than PATCH on purpose: absent means cleared. Sending only what
    // changed would wipe the notes every time someone edited a rating.
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, status: 'InProgress', notes: 'hard but fair' })],
      }),
    });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Rating' }), '8.5');
    await userEvent.click(save());

    await waitFor(() => expect(journal.saved).toHaveLength(1));
    expect(journal.saved[0]?.id).toBe(7);
    expect(journal.saved[0]?.body).toEqual({
      status: 'InProgress',
      rating: 8.5,
      notes: 'hard but fair',
      startedAt: null,
      completedAt: null,
    });
  });

  it('gives an untouched date back as the instant it was, not as midnight', async () => {
    const journal = journalServer({
      detail: gameDetail({
        logEntries: [logEntry({ id: 7, startedAt: '2026-08-21T01:30:00+00:00' })],
      }),
    });

    open();
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Rating' }), '9');
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
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Rating' }), '8.75');
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
    await userEvent.type(await screen.findByRole('spinbutton', { name: 'Rating' }), '9');
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
    expect(screen.getByText('Nov 2, 2024')).toBeInTheDocument();
    // One form, for the current pass. The history is a record, not a set of inputs.
    expect(screen.getAllByRole('spinbutton', { name: 'Rating' })).toHaveLength(1);
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

    const close = screen.getByRole('button', { name: 'Close' });
    save().focus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(save()).toHaveFocus();
  });
});
