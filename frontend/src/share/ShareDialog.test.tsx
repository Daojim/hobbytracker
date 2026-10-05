import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { SettingsMenu } from '../theme/SettingsMenu';
import { setColumnHidden } from '../board/hiddenColumns';
import { authServer } from '../test/auth';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { TOKEN, shareServer } from '../test/share';
import type { Share } from '../api/types';

/**
 * Sharing a board, from Settings: a Sharing group after Columns holding one row, and the dialog
 * it opens. Picked at the #9 workshop on 4 October 2026 over a second list of columns kept open
 * in the panel, which would have sat straight under the panel's own and looked just like it.
 */

const openSettings = () => userEvent.click(screen.getByRole('button', { name: 'Settings' }));

async function openDialog() {
  await openSettings();
  await userEvent.click(await screen.findByRole('button', { name: 'Share this board…' }));
  return screen.findByRole('dialog', { name: 'Share this board' });
}

const address = () => `${window.location.origin}/share/${TOKEN}`;

const SHARED: Share = { token: TOKEN, parts: ['InProgress', 'Completed', 'Stats'], showsName: false };

describe('sharing a board', () => {
  beforeEach(() => {
    // The dialog prints the name the "My name" box would put on the share.
    authServer();
  });

  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  describe('the row in Settings', () => {
    it('is a group of its own, after Columns and before Your data', async () => {
      shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openSettings();

      const group = await screen.findByRole('group', { name: 'Sharing' });
      expect(
        await within(group).findByRole('button', { name: 'Share this board…' }),
      ).toHaveAccessibleDescription('A read-only link. You choose what’s on it.');

      expect(
        screen.getAllByText(/^(Columns|Sharing|Your data)$/).map((heading) => heading.textContent),
      ).toEqual(['Columns', 'Sharing', 'Your data']);
    });

    it('says so once the board is shared', async () => {
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openSettings();

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Share this board…' })).toHaveAccessibleDescription(
          'Shared. Anyone with the link can see it.',
        ),
      );
    });

    it('is offered on a board that can be shared, and on no other yet', async () => {
      // Games first, as every feature in this phase is; the API would share any board.
      renderWithProviders(<SettingsMenu hobby="movies" />);
      await openSettings();

      expect(screen.getByRole('group', { name: 'Columns' })).toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Sharing' })).not.toBeInTheDocument();
    });
  });

  describe('before a link exists', () => {
    it('makes nothing by being opened', async () => {
      const share = shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();

      expect(
        await within(dialog).findByText('No link yet. Choose what it shows, then make it.'),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
      expect(share.made).toHaveLength(0);
    });

    it('starts from what this browser’s board shows, with the calendar and Stats on and the name off', async () => {
      setColumnHidden('games', 'OnHold', true);
      shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();

      expect(await within(dialog).findByRole('checkbox', { name: 'Playing' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'On Hold' })).not.toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'Completed' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'Dropped' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'Coming soon' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'Stats' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'My name' })).not.toBeChecked();

      // Backlog has no box, because every share shows it, and the name the box would show is
      // printed beside it rather than left for the owner to guess at.
      expect(within(dialog).getByText('Backlog, always')).toBeInTheDocument();
      expect(within(dialog).getByText('Jimmy Dao')).toBeInTheDocument();
    });

    it('makes the link with what the boxes say, and then shows its address', async () => {
      const share = shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Dropped' }));
      await userEvent.click(within(dialog).getByRole('checkbox', { name: 'My name' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Make the link' }));

      expect(
        await within(dialog).findByRole('textbox', { name: 'Link to this board' }),
      ).toHaveValue(address());
      expect(share.made).toEqual([
        { parts: ['InProgress', 'OnHold', 'Completed', 'Upcoming', 'Stats'], showsName: true },
      ]);

      // Ticking a box before the link existed wrote nothing: there was nothing to write to.
      expect(share.changed).toHaveLength(0);

      expect(within(dialog).getByRole('button', { name: 'Copy' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Stop sharing' })).toBeInTheDocument();
      expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: 'Make the link' })).not.toBeInTheDocument();
    });

    it('closes on Cancel having made nothing', async () => {
      const share = shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(share.made).toHaveLength(0);
    });

    it('shows the link another tab made, rather than making a second', async () => {
      const share = shareServer();
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await within(dialog).findByText('No link yet. Choose what it shows, then make it.');

      share.madeElsewhere(SHARED);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Make the link' }));

      expect(
        await within(dialog).findByRole('textbox', { name: 'Link to this board' }),
      ).toHaveValue(address());
      expect(within(dialog).getByRole('checkbox', { name: 'Dropped' })).not.toBeChecked();
    });
  });

  describe('once shared', () => {
    it('shows the address, and what the link shows rather than what this browser’s board does', async () => {
      setColumnHidden('games', 'Completed', true);
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();

      expect(
        await within(dialog).findByRole('textbox', { name: 'Link to this board' }),
      ).toHaveValue(address());
      expect(within(dialog).getByRole('checkbox', { name: 'Completed' })).toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'On Hold' })).not.toBeChecked();
      expect(within(dialog).getByRole('checkbox', { name: 'Coming soon' })).not.toBeChecked();
    });

    it('writes a box as it is ticked, every box each time, and asks nobody to save', async () => {
      const share = shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Dropped' }));

      await waitFor(() =>
        expect(share.changed).toEqual([
          { parts: ['InProgress', 'Completed', 'Dropped', 'Stats'], showsName: false },
        ]),
      );

      await userEvent.click(within(dialog).getByRole('checkbox', { name: 'My name' }));

      await waitFor(() =>
        expect(share.changed.at(-1)).toEqual({
          parts: ['InProgress', 'Completed', 'Dropped', 'Stats'],
          showsName: true,
        }),
      );

      expect(within(dialog).queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });

    it('sends the latest boxes once a write lands, rather than racing it', async () => {
      // Two writes in flight could land in either order, and the older winning would leave the
      // link showing a box the dialog says is off. So one goes at a time, carrying whatever the
      // boxes say when it goes.
      const share = shareServer(SHARED, { delayMs: 60 });
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('checkbox', { name: 'Dropped' }));
      await userEvent.click(within(dialog).getByRole('checkbox', { name: 'On Hold' }));
      await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Stats' }));

      await waitFor(() =>
        expect(share.changed.at(-1)).toEqual({
          parts: ['InProgress', 'OnHold', 'Completed', 'Dropped'],
          showsName: false,
        }),
      );
      expect(share.inFlightAtOnce).toBe(1);
    });

    it('copies the whole address', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Copy' }));

      expect(writeText).toHaveBeenCalledExactlyOnceWith(address());
      expect(await within(dialog).findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    });

    it('asks before it stops sharing, in the tint the app deletes in', async () => {
      const share = shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Stop sharing' }));

      // The question takes the footer's place, so Done is gone while it asks.
      expect(within(dialog).getByText('Stop sharing?')).toBeInTheDocument();
      expect(
        within(dialog).getByText('The link stops working for everyone who has it.'),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: 'Done' })).not.toBeInTheDocument();
      expect(share.stopped).toBe(0);

      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

      expect(within(dialog).getByRole('button', { name: 'Done' })).toBeInTheDocument();
      expect(share.stopped).toBe(0);

      await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

      expect(
        await within(dialog).findByText('No link yet. Choose what it shows, then make it.'),
      ).toBeInTheDocument();
      expect(share.stopped).toBe(1);
    });
  });

  describe('while a write works, and when one fails', () => {
    // Picked from renders of the built dialog on 5 October 2026: a write that fails says so, in
    // the spreadsheet row's failure line, and a button that is working says what it is doing.
    // The alternatives were a dialog that said nothing and buttons that only dimmed.

    /**
     * Holds every write of one kind until let go, counting them as they arrive. Answering nothing
     * then passes each on to the share's own handler, so what it records is what reached the API.
     */
    function holding(method: 'post' | 'delete') {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let arrived = 0;

      server.use(
        http[method]('/api/share', async () => {
          arrived += 1;
          await held;
        }),
      );

      return { release, arrived: () => arrived };
    }

    /** The next write of one kind answers 500, and the one after it goes through. */
    const failsOnce = (method: 'post' | 'put' | 'delete') =>
      server.use(
        http[method]('/api/share', () => new HttpResponse(null, { status: 500 }), { once: true }),
      );

    it('reads Making the link… while it works, and takes no second press', async () => {
      const share = shareServer();
      const writes = holding('post');
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Make the link' }));

      const making = await within(dialog).findByRole('button', { name: 'Making the link…' });
      expect(making).toHaveAttribute('aria-disabled', 'true');

      await userEvent.click(making);
      expect(writes.arrived()).toBe(1);

      writes.release();

      expect(
        await within(dialog).findByRole('textbox', { name: 'Link to this board' }),
      ).toHaveValue(address());
      expect(share.made).toHaveLength(1);
    });

    it('says so when the link could not be made, and makes it when pressed again', async () => {
      const share = shareServer();
      failsOnce('post');
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Make the link' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Couldn’t make the link. Try again.',
      );
      expect(
        within(dialog).getByText('No link yet. Choose what it shows, then make it.'),
      ).toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: 'Make the link' }));

      expect(
        await within(dialog).findByRole('textbox', { name: 'Link to this board' }),
      ).toHaveValue(address());
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
      expect(share.made).toHaveLength(1);
    });

    it('says so when a box could not be written, and puts it back as the link has it', async () => {
      const share = shareServer(SHARED);
      failsOnce('put');
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      const dropped = await within(dialog).findByRole('checkbox', { name: 'Dropped' });
      await userEvent.click(dropped);

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Couldn’t change what the link shows. Try again.',
      );
      expect(dropped).not.toBeChecked();

      // Ticking it again is trying again: the line goes, and this time the box is written.
      await userEvent.click(dropped);

      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
      await waitFor(() =>
        expect(share.changed).toEqual([
          { parts: ['InProgress', 'Completed', 'Dropped', 'Stats'], showsName: false },
        ]),
      );
      expect(dropped).toBeChecked();
    });

    it('reads Stopping… while it works, and takes no second press', async () => {
      const share = shareServer(SHARED);
      const writes = holding('delete');
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Stop sharing' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

      const stopping = await within(dialog).findByRole('button', { name: 'Stopping…' });
      expect(stopping).toHaveAttribute('aria-disabled', 'true');

      await userEvent.click(stopping);
      expect(writes.arrived()).toBe(1);

      // Nor can the question be taken back while the link is going.
      await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
      expect(within(dialog).getByText('Stop sharing?')).toBeInTheDocument();

      writes.release();

      expect(
        await within(dialog).findByText('No link yet. Choose what it shows, then make it.'),
      ).toBeInTheDocument();
      expect(share.stopped).toBe(1);
    });

    it('says so when sharing could not be stopped, and keeps the link and the question', async () => {
      const share = shareServer(SHARED);
      failsOnce('delete');
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Stop sharing' }));
      await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

      expect(await within(dialog).findByRole('alert')).toHaveTextContent(
        'Couldn’t stop sharing. Try again.',
      );
      expect(within(dialog).getByRole('textbox', { name: 'Link to this board' })).toHaveValue(
        address(),
      );

      // Still asking, so trying again is one press.
      await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));

      expect(
        await within(dialog).findByText('No link yet. Choose what it shows, then make it.'),
      ).toBeInTheDocument();
      expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
      expect(share.stopped).toBe(1);
    });
  });

  describe('as a dialog', () => {
    it('is modal over the board, and takes the keyboard in with it', async () => {
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();

      expect(dialog).toHaveAttribute('aria-modal', 'true');
      await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement));

      // The panel it was opened from has gone, so the dialog is the one thing open.
      expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
    });

    it('closes on Escape, and hands the keyboard back to Settings', async () => {
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      await openDialog();
      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
    });

    it('closes on Done, and on a press outside it', async () => {
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await userEvent.click(await within(dialog).findByRole('button', { name: 'Done' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      await openDialog();
      await userEvent.click(screen.getByRole('presentation'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('keeps Tab inside, as the journal does', async () => {
      shareServer(SHARED);
      renderWithProviders(<SettingsMenu hobby="games" />);

      const dialog = await openDialog();
      await within(dialog).findByRole('button', { name: 'Done' });

      within(dialog).getByRole('button', { name: 'Done' }).focus();
      await userEvent.tab();

      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    });
  });
});
