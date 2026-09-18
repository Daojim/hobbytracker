import { afterEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { hiddenColumnsKey } from '../board/hiddenColumns';
import { SettingsMenu } from './SettingsMenu';
import { DENSITY_ATTRIBUTE, JOURNAL_ATTRIBUTE, THEME_ATTRIBUTE } from './theme';

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
});
