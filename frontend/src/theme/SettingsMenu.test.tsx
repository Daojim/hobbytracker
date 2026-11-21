import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router';
import writeXlsxFile from 'write-excel-file/browser';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { shareServer } from '../test/share';
import { logEntry } from '../test/passes';
import { hiddenColumnsKey } from '../board/hiddenColumns';
import { paceKey, parsePace } from '../lib/pace';
import { todayHere } from '../lib/time';
import { sessionKey } from '../api/auth';
import type { Account, ExportTitle } from '../api/types';
import { SignInPage } from '../shell/SignInPage';
import { SettingsMenu } from './SettingsMenu';
import { windowOfWidth } from '../test/media';
import { DENSITY_ATTRIBUTE, JOURNAL_ATTRIBUTE, JOURNAL_KEY, THEME_ATTRIBUTE } from './theme';

// The writer is what the row loads when it is pressed. Here it is a spy, so a test can say what
// it was handed and when, without a browser to save a file into.
vi.mock('write-excel-file/browser', () => ({ default: vi.fn() }));

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
};

describe('SettingsMenu', () => {
  beforeEach(() => {
    // The panel asks after the board's share link as it opens, for its Sharing row's line. None,
    // unless a test says otherwise; share/ShareDialog.test.tsx is where sharing is tested.
    shareServer();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
    document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
  });

  it('is a gear named Settings, with the dialog shut until it is asked for', () => {
    renderWithProviders(<SettingsMenu hobby="games" />);

    const gear = screen.getByRole('button', { name: 'Settings' });
    // Named in words for a voice and a tooltip, because the button itself is a drawing.
    expect(gear).toHaveAttribute('title', 'Settings');
    expect(gear).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a dialog named Settings, which takes the keyboard', async () => {
    // A dialog since #27, where it was a panel under the button: the seven settings it gained
    // would have made the panel about 1,510px tall.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    const dialog = screen.getByRole('dialog', { name: 'Settings' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();
  });

  it('keeps Tab inside the dialog, from its last stop to its first', async () => {
    // aria-modal says the page behind is inert, and a Tab that walked out onto it would make
    // that false for anyone who reads by tabbing.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    const close = screen.getByRole('button', { name: 'Close' });
    const last = screen.getByRole('button', { name: 'Delete my account…' });

    last.focus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(last).toHaveFocus();
  });

  it('sets Every board beside this board’s settings, headed by the board’s name', async () => {
    renderWithProviders(<SettingsMenu hobby="movies" />);
    await open();

    const every = screen.getByRole('group', { name: 'Every board' });
    const board = screen.getByRole('group', { name: 'Movies' });
    const data = screen.getByRole('group', { name: 'Your data' });

    expect(within(every).getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument();
    expect(within(every).getByRole('radiogroup', { name: 'Journal' })).toBeInTheDocument();
    expect(within(board).getByRole('group', { name: 'Columns' })).toBeInTheDocument();

    // Appearance first, the board's own next, and what you have across the foot.
    expect(every.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(board.compareDocumentPosition(data) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('draws no Journal switch on a phone, where the journal fills the screen either way', async () => {
    // The stored choice still applies when the same browser is wider, so nothing is cleared.
    windowOfWidth(390);
    try {
      localStorage.setItem(JOURNAL_KEY, 'drawer');
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument();
      expect(screen.queryByRole('radiogroup', { name: 'Journal' })).not.toBeInTheDocument();
      expect(localStorage.getItem(JOURNAL_KEY)).toBe('drawer');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('holds no themes, which are the palette’s since #27', async () => {
    // The themes were most of the panel's height, which is why the user asked for the workshop.
    // They are a control of their own in the header now: theme/ThemeMenu.tsx.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'System' })).not.toBeInTheDocument();
  });

  it('applies and remembers a density', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(document.documentElement.getAttribute(DENSITY_ATTRIBUTE)).toBe('compact');
  });

  it('offers the journal as a drawer or a modal, a modal until told otherwise', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(screen.getByRole('radio', { name: 'Modal' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Drawer' }));

    expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe('drawer');
  });

  it('closes on Escape and hands the keyboard back to the gear', async () => {
    // The drawer already establishes this: a control that opens something has to be where focus
    // returns to, or the next Tab starts from the top of the document.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('closes by its ×, and by a press on the page around it, handing the keyboard back', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);

    await open();
    await userEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();

    await open();
    await userEvent.click(screen.getByRole('presentation'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('shuts as Share this board… opens its dialog, which hands the keyboard back to the gear', async () => {
    // One dialog at a time: Share's opens in Settings' place, and closing it returns to the gear
    // rather than to a row that went with Settings.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.click(await screen.findByRole('button', { name: 'Share this board…' }));
    expect(await screen.findByRole('dialog', { name: 'Share this board' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Settings' })).not.toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('stays open while you are choosing, because the settings are usually set together', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(screen.getByRole('radiogroup', { name: 'Journal' })).toBeInTheDocument();
  });

  it('credits the two providers the app takes its metadata from', async () => {
    // TMDB's API terms require this sentence, near-verbatim, in an About or Credits area, and
    // the app has no About section — so the settings panel is the credits area. IGDB is beside
    // it because crediting one provider and not the other would be odd rather than compliant.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(
      screen.getByText(/uses the TMDB API but is not endorsed or certified by TMDB/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/IGDB/)).toBeInTheDocument();
  });

  it('offers every column but Backlog, in the board’s words, all of them shown to begin with', async () => {
    // Ticked means shown. The group never says "hide": that word already means *fold* on the
    // board — Dropped's Show/Hide and the calendar's — and a third meaning in the header would be
    // one too many for the same four letters.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    const boxes = within(screen.getByRole('group', { name: 'Columns' })).getAllByRole('checkbox');

    expect(boxes).toHaveLength(4);
    ['Playing', 'On Hold', 'Completed', 'Dropped'].forEach((name, index) => {
      expect(boxes[index]).toHaveAccessibleName(name);
      expect(boxes[index]).toBeChecked();
    });
  });

  it('names the columns the way the board it is on does', async () => {
    renderWithProviders(<SettingsMenu hobby="movies" />);
    await open();

    const boxes = within(screen.getByRole('group', { name: 'Columns' })).getAllByRole('checkbox');

    ['Watching', 'On Hold', 'Watched', 'Dropped'].forEach((name, index) => {
      expect(boxes[index]).toHaveAccessibleName(name);
    });
  });

  it('says Backlog always shows, rather than offering a box that could never be unticked', async () => {
    // A disabled checkbox claims it would work under some other condition, which is the reason
    // the nav's unbuilt hobbies are plain text rather than disabled links. Backlog has no such
    // condition: search adds every title to it.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(screen.queryByRole('checkbox', { name: 'Backlog' })).not.toBeInTheDocument();
    expect(screen.getByText(/Backlog always shows/)).toBeInTheDocument();
  });

  it('takes a column off this board when it is unticked, and puts it back when ticked', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Dropped' }));

    expect(screen.getByRole('checkbox', { name: 'Dropped' })).not.toBeChecked();
    expect(JSON.parse(localStorage.getItem(hiddenColumnsKey('games'))!)).toEqual(['Dropped']);
    expect(localStorage.getItem(hiddenColumnsKey('movies'))).toBeNull();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Dropped' }));

    expect(screen.getByRole('checkbox', { name: 'Dropped' })).toBeChecked();
    expect(JSON.parse(localStorage.getItem(hiddenColumnsKey('games'))!)).toEqual([]);
  });

  describe('your pace', () => {
    const pace = () => screen.getByRole('group', { name: 'Your pace' });

    it('says how much you play and how you play, from the question in a game’s journal', async () => {
      localStorage.setItem(
        paceKey('games'),
        JSON.stringify({ hours: 2, per: 'day', style: 'hltbMainStoryHours' }),
      );
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      expect(within(pace()).getByText('2 h a day · Main story')).toBeInTheDocument();
      expect(
        within(pace()).getByText('From How long will it take me? in a game’s journal.'),
      ).toBeInTheDocument();
      expect(within(pace()).getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });

    it('says Not set, and where one is set, when nothing has been said', async () => {
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      expect(within(pace()).getByText('Not set')).toBeInTheDocument();
      expect(
        within(pace()).getByText('How long will it take me? in a game’s journal sets it.'),
      ).toBeInTheDocument();
      expect(within(pace()).queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });

    it('forgets both answers on Clear, and keeps the keyboard in the dialog on the line', async () => {
      // The button goes with the pace, and the keyboard with it would fall out of the dialog
      // onto the page behind, which the next Tab would walk. It lands on what the line now says.
      localStorage.setItem(
        paceKey('games'),
        JSON.stringify({ hours: 2, per: 'day', style: 'hltbMainStoryHours' }),
      );
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      await userEvent.click(within(pace()).getByRole('button', { name: 'Clear' }));

      expect(parsePace(localStorage.getItem(paceKey('games')))).toEqual({ pace: null, style: null });
      expect(within(pace()).getByText('Not set')).toHaveFocus();
      expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument();
    });

    it('is only where a board has HowLongToBeat’s figures, which the question answers from', async () => {
      // The data's say, never the slug: a film has no estimates for the question to sit under.
      renderWithProviders(<SettingsMenu hobby="movies" />);
      await open();

      expect(screen.queryByRole('group', { name: 'Your pace' })).not.toBeInTheDocument();
    });
  });

  it('does not use TMDB’s logo or wordmark as a graphic', async () => {
    // The other half of the terms: the attribution is a sentence, and their logo has its own
    // rules about size, placement and alteration that a bare <img> would not be keeping. Text
    // costs nothing and cannot breach them.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(screen.queryByRole('img', { name: /tmdb/i })).not.toBeInTheDocument();
  });

  describe('the spreadsheet', () => {
    const HOLDS = 'Every game, playthrough and note on this board, as an Excel file.';
    const FAILED = 'Couldn’t make the spreadsheet. Try again.';

    const saved = vi.fn<(fileName: string) => Promise<void>>();

    const hollowKnight: ExportTitle = {
      mediaId: 3003,
      title: 'Hollow Knight',
      genres: ['Platform'],
      primaryGenre: null,
      developers: ['Team Cherry'],
      releaseDate: '2017-02-24',
      releasePrecision: 'Day',
      hltbMainStoryHours: 27,
      hltbMainExtraHours: 41.6,
      hltbCompletionistHours: 65.59,
      hltbAllStylesHours: 41.82,
      hltbId: 26286,
      passes: [logEntry()],
    };

    /** The export, answered with these titles, counting the requests that ask for it. */
    function answer(titles: ExportTitle[] = [hollowKnight]) {
      const asked: URL[] = [];
      server.use(
        http.get('/api/library/export', ({ request }) => {
          asked.push(new URL(request.url));
          return HttpResponse.json(titles);
        }),
      );
      return asked;
    }

    const row = () => screen.getByRole('button', { name: 'Download a spreadsheet' });

    beforeEach(() => {
      saved.mockReset().mockResolvedValue();
      vi.mocked(writeXlsxFile).mockReset().mockReturnValue({ toFile: saved, toBlob: vi.fn() });
    });

    it('is a row in a Your data group, after the columns, saying what the file holds', async () => {
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      const group = screen.getByRole('group', { name: 'Your data' });
      expect(within(group).getByRole('button', { name: 'Download a spreadsheet' })).toBe(row());
      expect(row()).toHaveAccessibleDescription(HOLDS);

      const columns = screen.getByRole('group', { name: 'Columns' });
      expect(columns.compareDocumentPosition(group) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('is not offered on a board whose hobby has no spreadsheet yet', async () => {
      // The group stays, because deleting your account belongs to every board.
      renderWithProviders(<SettingsMenu hobby="movies" />);
      await open();

      expect(screen.queryByRole('button', { name: /spreadsheet/i })).not.toBeInTheDocument();
    });

    it('downloads this board’s file, named for the board and for today here', async () => {
      const asked = answer();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      await userEvent.click(row());

      await waitFor(() => expect(saved).toHaveBeenCalledWith(`hobbytracker-games-${todayHere()}.xlsx`));
      expect(asked.map((url) => url.searchParams.get('hobby'))).toEqual(['games']);

      // Handed the three sheets, built from what the API answered.
      const [sheets] = vi.mocked(writeXlsxFile).mock.calls[0] as unknown as [
        { sheet: string; data: unknown[] }[],
      ];
      expect(sheets.map((sheet) => sheet.sheet)).toEqual(['Games', 'Playthroughs', 'Notes']);
      expect(sheets[0]?.data).toHaveLength(2);
    });

    it('reads Preparing… while it works, and takes no second press', async () => {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let asked = 0;
      server.use(
        http.get('/api/library/export', async () => {
          asked += 1;
          await held;
          return HttpResponse.json([hollowKnight]);
        }),
      );

      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();
      await userEvent.click(row());

      const preparing = await screen.findByRole('button', { name: 'Preparing…' });
      expect(preparing).toHaveAttribute('aria-disabled', 'true');

      await userEvent.click(preparing);
      expect(asked).toBe(1);

      release();

      await screen.findByRole('button', { name: 'Download a spreadsheet' });
      expect(saved).toHaveBeenCalledTimes(1);
      expect(row()).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('says so when it fails, and works again when pressed again', async () => {
      server.use(http.get('/api/library/export', () => new HttpResponse(null, { status: 500 })));

      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();
      await userEvent.click(row());

      // The line under the row becomes the alert, rather than a second line beside it.
      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
      expect(screen.queryByText(HOLDS)).not.toBeInTheDocument();
      expect(row()).toHaveAccessibleDescription(FAILED);
      expect(saved).not.toHaveBeenCalled();

      answer();
      await userEvent.click(row());

      await waitFor(() => expect(saved).toHaveBeenCalledTimes(1));
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(row()).toHaveAccessibleDescription(HOLDS);
    });

    it('fails the same way when the file cannot be written', async () => {
      answer();
      saved.mockRejectedValueOnce(new Error('the browser refused'));

      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();
      await userEvent.click(row());

      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
    });
  });

  describe('deleting your account', () => {
    const ACCOUNT: Account = {
      signedInWith: ['google'],
      boards: [
        { hobby: 'games', titles: 36 },
        { hobby: 'movies', titles: 9 },
      ],
      notes: 41,
      pictures: 0,
    };

    // With plain spaces, although the page joins each number to its word with one that never
    // breaks: Testing Library folds every kind of space into one before it compares. That rule
    // is account/warning.test.ts's to hold.
    const WARNING =
      'This deletes the account you signed in to with Google, and everything on every board: '
      + '36 games, 9 films and 41 notes.';
    const WITHOUT_NUMBERS = 'This deletes your account and everything on every board.';
    const FAILED = 'Couldn’t delete your account. Try again.';

    /** What the account holds, as the warning asks for it. */
    function counts(account: Account = ACCOUNT) {
      server.use(http.get('/api/account', () => HttpResponse.json(account)));
    }

    /** The delete, answered, counting the requests that reach it. */
    function deletes(status = 204) {
      const asked = { count: 0 };
      server.use(
        http.delete('/api/account', () => {
          asked.count += 1;
          return new HttpResponse(null, { status });
        }),
      );
      return asked;
    }

    /** A delete held open until the test lets it answer. */
    function deletesWhenReleased() {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      const asked = { count: 0 };
      server.use(
        http.delete('/api/account', async () => {
          asked.count += 1;
          await held;
          return new HttpResponse(null, { status: 204 });
        }),
      );
      return { asked, release: () => release() };
    }

    /** The board and the sign-in screen, so a test can see where a delete lands. */
    function renderBoardAndSignIn(options: { keepsCache?: boolean } = {}) {
      return renderWithProviders(
        <Routes>
          <Route path="/board/:hobby" element={<SettingsMenu hobby="games" />} />
          <Route path="/signin" element={<SignInPage />} />
        </Routes>,
        options,
      );
    }

    const row = () => screen.getByRole('button', { name: 'Delete my account…' });
    const warning = () => screen.getByRole('group', { name: 'Delete my account' });
    const field = () => screen.getByRole('textbox', { name: 'Type delete to confirm' });
    const confirm = () => screen.getByRole('button', { name: 'Delete my account' });

    const openWarning = async () => {
      await open();
      await userEvent.click(row());
    };

    it('is a row in the Your data group, after the spreadsheet', async () => {
      renderWithProviders(<SettingsMenu hobby="games" />);
      await open();

      const rows = within(screen.getByRole('group', { name: 'Your data' })).getAllByRole('button');

      expect(rows).toHaveLength(2);
      expect(rows[0]).toHaveAccessibleName('Download a spreadsheet');
      expect(rows[1]).toHaveAccessibleName('Delete my account…');
    });

    it('is offered on every board, because an account is every board’s', async () => {
      renderWithProviders(<SettingsMenu hobby="movies" />);
      await open();

      const group = screen.getByRole('group', { name: 'Your data' });
      expect(within(group).getByRole('button', { name: 'Delete my account…' })).toBe(row());
    });

    it('opens a warning that counts every board, names the sign-in and mentions the backups', async () => {
      counts();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openWarning();

      expect(await within(warning()).findByText(WARNING)).toBeInTheDocument();
      expect(within(warning()).getByText('It can’t be undone.')).toBeInTheDocument();
      expect(
        within(warning()).getByText(
          'The nightly backups keep a copy for about two weeks, then that goes too.',
        ),
      ).toBeInTheDocument();
    });

    it('puts the keyboard in the field, which reads the warning out', async () => {
      counts();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openWarning();
      await within(warning()).findByText(WARNING);

      expect(field()).toHaveFocus();
      expect(field()).toHaveAccessibleDescription(
        /^This deletes the account you signed in to with Google, .* It can’t be undone\./,
      );
    });

    it('does nothing until the field says delete', async () => {
      counts();
      const asked = deletes();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openWarning();

      expect(confirm()).toHaveAttribute('aria-disabled', 'true');
      await userEvent.click(confirm());

      await userEvent.type(field(), 'delet');
      await userEvent.click(confirm());
      await userEvent.type(field(), '{Enter}');

      expect(asked.count).toBe(0);
      expect(confirm()).toHaveAttribute('aria-disabled', 'true');
    });

    it('takes delete in any case and with spaces around it, as a phone may type it', async () => {
      counts();
      const asked = deletes();
      renderBoardAndSignIn();
      await openWarning();

      await userEvent.type(field(), ' Delete ');

      expect(confirm()).not.toHaveAttribute('aria-disabled');
      await userEvent.click(confirm());

      await waitFor(() => expect(asked.count).toBe(1));
    });

    it('deletes on Enter once the field says delete', async () => {
      counts();
      const asked = deletes();
      renderBoardAndSignIn();
      await openWarning();

      await userEvent.type(field(), 'delete{Enter}');

      await waitFor(() => expect(asked.count).toBe(1));
    });

    it('reads Deleting… while it works, holds the field and Cancel, and takes no second press', async () => {
      counts();
      const { asked, release } = deletesWhenReleased();
      renderBoardAndSignIn();
      await openWarning();
      await userEvent.type(field(), 'delete');
      await userEvent.click(confirm());

      const deleting = await screen.findByRole('button', { name: 'Deleting…' });
      const cancel = screen.getByRole('button', { name: 'Cancel' });

      expect(deleting).toHaveAttribute('aria-disabled', 'true');
      expect(field()).toHaveAttribute('readonly');
      expect(cancel).toHaveAttribute('aria-disabled', 'true');

      // Cancel cannot stop a delete that has already been sent, so it does not pretend to.
      await userEvent.click(deleting);
      await userEvent.click(cancel);

      expect(warning()).toBeInTheDocument();
      expect(asked.count).toBe(1);

      release();

      expect(await screen.findByRole('heading', { name: 'Account deleted' })).toBeInTheDocument();
    });

    it('says so when it fails, and works again when pressed again', async () => {
      counts();
      deletes(500);
      renderBoardAndSignIn();
      await openWarning();
      await userEvent.type(field(), 'delete');
      await userEvent.click(confirm());

      expect(await screen.findByRole('alert')).toHaveTextContent(FAILED);
      expect(confirm()).not.toHaveAttribute('aria-disabled');

      // Under the tint rather than inside it: `danger` on `bg-danger/10` measured 4.24:1 on
      // Dusk, where the panel's own ground gives it 5.05. index.css.test.ts says why in full.
      expect(warning()).not.toContainElement(screen.getByRole('alert'));

      deletes();
      await userEvent.click(confirm());

      expect(await screen.findByRole('heading', { name: 'Account deleted' })).toBeInTheDocument();
    });

    it('closes on Cancel, gives the keyboard back to the row, and forgets what was typed', async () => {
      counts();
      renderWithProviders(<SettingsMenu hobby="games" />);
      await openWarning();
      await userEvent.type(field(), 'delete');

      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      expect(screen.queryByRole('group', { name: 'Delete my account' })).not.toBeInTheDocument();
      expect(row()).toHaveFocus();

      await userEvent.click(row());

      expect(field()).toHaveValue('');
    });

    it('goes without numbers when it cannot count, and still deletes', async () => {
      server.use(http.get('/api/account', () => new HttpResponse(null, { status: 500 })));
      const asked = deletes();
      renderBoardAndSignIn();
      await openWarning();

      expect(await within(warning()).findByText(WITHOUT_NUMBERS)).toBeInTheDocument();

      await userEvent.type(field(), 'delete{Enter}');

      await waitFor(() => expect(asked.count).toBe(1));
    });

    it('counts afresh every time it opens, and never shows what it counted before', async () => {
      // keepsCache, because the bug this guards against is the cache keeping something: the
      // app holds a query's answer for five minutes by default, and a warning reopened in that
      // time would print the numbers it found the first time, however much had been added since.
      counts();
      renderWithProviders(<SettingsMenu hobby="games" />, { keepsCache: true });
      await openWarning();
      await within(warning()).findByText(WARNING);
      await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      server.use(
        http.get('/api/account', async () => {
          await held;
          return HttpResponse.json({ ...ACCOUNT, notes: 42 });
        }),
      );
      await userEvent.click(row());

      expect(within(warning()).getByText(WITHOUT_NUMBERS)).toBeInTheDocument();

      release();

      expect(await within(warning()).findByText(/42 notes\.$/)).toBeInTheDocument();
    });

    it('lands on the sign-in screen saying the account is gone, with nothing of it left behind', async () => {
      counts();
      deletes();
      const { queryClient } = renderBoardAndSignIn({ keepsCache: true });

      // Something of the board's, as a session leaves the cache holding.
      queryClient.setQueryData(['library', 'games', 'Backlog'], { items: [] });

      await openWarning();
      await userEvent.type(field(), 'delete{Enter}');

      const heading = await screen.findByRole('heading', { level: 1, name: 'Account deleted' });

      expect(heading).toHaveFocus();
      expect(queryClient.getQueryData(['library', 'games', 'Backlog'])).toBeUndefined();
      expect(queryClient.getQueryData(sessionKey)).toBeNull();
    });

    it('is still deleting when the panel is shut and opened again, and still lands there', async () => {
      // The delete is held by the menu rather than by the warning, as the spreadsheet is. Shut,
      // the panel takes the warning with it; opened again, it has to find the delete still going
      // rather than offer the row as though nothing had been pressed.
      counts();
      const { asked, release } = deletesWhenReleased();
      renderBoardAndSignIn();
      await openWarning();
      await userEvent.type(field(), 'delete{Enter}');
      await screen.findByRole('button', { name: 'Deleting…' });

      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('group', { name: 'Delete my account' })).not.toBeInTheDocument();

      await open();

      expect(screen.queryByRole('button', { name: 'Delete my account…' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Deleting…' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );

      release();

      expect(await screen.findByRole('heading', { name: 'Account deleted' })).toBeInTheDocument();
      expect(asked.count).toBe(1);
    });
  });
});
