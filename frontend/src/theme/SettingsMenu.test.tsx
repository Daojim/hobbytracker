import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import writeXlsxFile from 'write-excel-file/browser';
import { renderWithProviders } from '../test/render';
import { server } from '../test/server';
import { logEntry } from '../test/passes';
import { hiddenColumnsKey } from '../board/hiddenColumns';
import { todayHere } from '../lib/time';
import type { ExportTitle } from '../api/types';
import { SettingsMenu } from './SettingsMenu';
import { DENSITY_ATTRIBUTE, JOURNAL_ATTRIBUTE, THEME_ATTRIBUTE } from './theme';

// The writer is what the row loads when it is pressed. Here it is a spy, so a test can say what
// it was handed and when, without a browser to save a file into.
vi.mock('write-excel-file/browser', () => ({ default: vi.fn() }));

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
};

describe('SettingsMenu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
    document.documentElement.removeAttribute(JOURNAL_ATTRIBUTE);
  });

  it('keeps the panel shut until it is asked for', () => {
    renderWithProviders(<SettingsMenu hobby="games" />);

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('offers every theme, and says which one is on', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    // System is the default and so the one checked before anything has been chosen.
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ember' })).not.toBeChecked();
  });

  it('applies and remembers a theme', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Ember' }));

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
    expect(screen.getByRole('radio', { name: 'Ember' })).toBeChecked();
  });

  it('applies and remembers a density', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(document.documentElement.getAttribute(DENSITY_ATTRIBUTE)).toBe('compact');
  });

  it('takes the attribute back off for System, so the OS decides again', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Console' }));
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it('offers the journal as a drawer or a modal', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    expect(screen.getByRole('radio', { name: 'Drawer' })).toBeChecked();

    await userEvent.click(screen.getByRole('radio', { name: 'Modal' }));

    expect(document.documentElement.getAttribute(JOURNAL_ATTRIBUTE)).toBe('modal');
  });

  it('closes on Escape and hands the keyboard back to the button', async () => {
    // The drawer already establishes this: a control that opens something has to be where focus
    // returns to, or the next Tab starts from the top of the document.
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('closes when the click lands somewhere else', async () => {
    renderWithProviders(
      <div>
        <SettingsMenu hobby="games" />
        <button type="button">Elsewhere</button>
      </div>,
    );
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('stays open while you are choosing, because the two settings are usually set together', async () => {
    renderWithProviders(<SettingsMenu hobby="games" />);
    await open();

    await userEvent.click(screen.getByRole('radio', { name: 'Shelf Dark' }));

    expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument();
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
      // And with nothing else in it yet, the group goes with it.
      renderWithProviders(<SettingsMenu hobby="movies" />);
      await open();

      expect(screen.queryByRole('button', { name: /spreadsheet/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('group', { name: 'Your data' })).not.toBeInTheDocument();
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
});
