import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MATCH_MARK } from '../lib/Marked';
import { windowOfWidth } from '../test/media';
import { renderWithProviders } from '../test/render';
import { PALETTES } from './palettes';
import { ThemeMenu } from './ThemeMenu';
import {
  MINE_KEY,
  THEME_ATTRIBUTE,
  THEME_KEY,
  applyMine,
  applyTheme,
  type Mine,
  type NamedTheme,
} from './theme';

/**
 * The panel that makes a theme of your own (#28), reached as a person reaches it: from the
 * palette's list. It sits beside the board with no scrim, and the board wears each change as it
 * is made, so what these read is the root, where the theme is worn, as well as the panel.
 */

const root = document.documentElement;
const worn = (token: string) => root.style.getPropertyValue(token);

/** Wears a theme and stores the choice, as a load would leave the page before this opens. */
const wearing = (theme: NamedTheme | 'system') => {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
};

/** Keeps a theme of your own and wears it, as a load would. */
const wearingMine = (mine: Mine) => {
  localStorage.setItem(MINE_KEY, JSON.stringify(mine));
  localStorage.setItem(THEME_KEY, 'mine');
  applyMine(mine);
};

const openPanel = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
  await userEvent.click(screen.getByRole('button', { name: /^(Make your own…|Edit…)$/ }));
  return screen.findByRole('dialog', { name: 'Your own theme' });
};

const box = (part: 'Ground' | 'Card' | 'Accent') => screen.getByRole('textbox', { name: part });

const type = async (part: 'Ground' | 'Card' | 'Accent', value: string) => {
  await userEvent.clear(box(part));
  await userEvent.type(box(part), value);
};

const madeFrom = () => screen.getByRole('combobox', { name: 'Made from' });

const harbour = async () => {
  await userEvent.selectOptions(madeFrom(), 'dusk');
  await type('Ground', '#23393b');
  await type('Card', '#2f4a4d');
  await type('Accent', '#4f86b5');
};

describe('the panel that makes a theme of your own', () => {
  afterEach(() => {
    localStorage.clear();
    root.removeAttribute(THEME_ATTRIBUTE);
    root.removeAttribute('style');
    document.head.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('opening', () => {
    it('opens from Make your own… on the theme you wear, with its three colours, and changes nothing', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      expect(madeFrom()).toHaveValue('frost');
      expect(box('Ground')).toHaveValue('#e4e9f0');
      expect(box('Card')).toHaveValue('#fbfcfe');
      expect(box('Accent')).toHaveValue('#1a5f9e');

      // Worn as a theme of your own made from Frost, which is Frost exactly.
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('frost');
      expect(worn('--surface')).toBe(PALETTES.frost.tokens['--surface']);
      expect(worn('--muted')).toBe(PALETTES.frost.tokens['--muted']);
      expect(screen.queryByText(/Hard to/)).not.toBeInTheDocument();
    });

    it('starts from the theme System is showing, light or dark', async () => {
      windowOfWidth(1440, { dark: true });
      wearing('system');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      expect(madeFrom()).toHaveValue('shelf-dark');
      expect(box('Card')).toHaveValue(PALETTES['shelf-dark'].tokens['--surface']);
    });

    it('starts from Shelf Light under System on a light device', async () => {
      windowOfWidth(1440, { dark: false });
      wearing('system');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      expect(madeFrom()).toHaveValue('shelf-light');
    });

    it('opens Edit… on the theme you kept, whatever you are wearing', async () => {
      wearingMine({
        from: 'shelf-dark',
        scheme: 'dark',
        tokens: { ...PALETTES['shelf-dark'].tokens, '--surface': '#1b261f', '--sunken': '#111a15', '--accent': '#e3b04b' },
      });
      // Then Ember, chosen since: the kept one is still there to edit.
      renderWithProviders(<ThemeMenu />);
      await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
      await userEvent.click(screen.getByRole('radio', { name: 'Ember' }));
      await userEvent.click(screen.getByRole('button', { name: 'Edit…' }));
      await screen.findByRole('dialog', { name: 'Your own theme' });

      expect(madeFrom()).toHaveValue('shelf-dark');
      expect(box('Ground')).toHaveValue('#111a15');
      expect(box('Card')).toHaveValue('#1b261f');
      expect(box('Accent')).toHaveValue('#e3b04b');
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('shelf-dark');
    });

    it('takes the keyboard, and gives it back to the palette when it closes', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      const panel = await openPanel();

      expect(panel).toHaveFocus();
      await userEvent.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Theme' })).toHaveFocus();
    });
  });

  describe('picking', () => {
    it('wears a colour typed into its box, once it is a whole #rrggbb', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      await type('Card', '#2F4A4');
      expect(worn('--surface')).toBe(PALETTES.frost.tokens['--surface']);

      await userEvent.type(box('Card'), 'D');
      expect(worn('--surface')).toBe('#2f4a4d');
      expect(box('Card')).toHaveValue('#2f4a4d');

      // And not a word that is not one.
      await type('Card', 'teal');
      expect(worn('--surface')).toBe('#2f4a4d');
    });

    it('wears the colour the browser’s swatch hands it, and says it in the box', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      fireEvent.input(screen.getByLabelText('Accent', { selector: 'input[type="color"]' }), {
        target: { value: '#a3344f' },
      });

      expect(worn('--accent')).toBe('#a3344f');
      expect(box('Accent')).toHaveValue('#a3344f');
    });

    it('moves the bar above the page with the ground', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await type('Ground', '#9aa3ad');

      expect(
        document.head.querySelector('meta[name="theme-color"]:not([media])')?.getAttribute('content'),
      ).toBe('#9aa3ad');
    });

    it('keeps your three colours when Made from changes, and works the rest out its way', async () => {
      wearing('shelf-dark');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await type('Card', '#2f4a4d');

      await userEvent.selectOptions(madeFrom(), 'dusk');

      expect(box('Card')).toHaveValue('#2f4a4d');
      expect(box('Ground')).toHaveValue(PALETTES['shelf-dark'].tokens['--sunken']);
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dusk');
      // Dusk keeps an outline round a card, and Shelf Dark does not.
      expect(worn('--card-line')).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('puts the theme’s own colours back when asked to start again', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();

      await userEvent.click(screen.getByRole('button', { name: 'Start again from Dusk’s colours' }));

      expect(box('Ground')).toHaveValue(PALETTES.dusk.tokens['--sunken']);
      expect(box('Card')).toHaveValue(PALETTES.dusk.tokens['--surface']);
      expect(box('Accent')).toHaveValue(PALETTES.dusk.tokens['--accent']);
      expect(worn('--muted')).toBe(PALETTES.dusk.tokens['--muted']);
    });

    it('says under a colour that it is the theme’s own, while it is', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      expect(screen.getByText('Cards, panels and dialogs, as Frost’s')).toBeInTheDocument();
      await type('Card', '#b9c1ca');
      expect(screen.getByText('Cards, panels and dialogs')).toBeInTheDocument();
    });
  });

  describe('a colour that cannot be read', () => {
    it('is said under the colour it answers to, with each ratio and its bar', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();

      expect(box('Ground')).not.toHaveAccessibleDescription();
      expect(box('Card')).toHaveAccessibleDescription(
        'Hard to see: the Horror genre stripe (1.45:1). The faintest stripe any theme has is 1.48:1.',
      );
      expect(box('Accent')).toHaveAccessibleDescription(
        'Hard to read: the accent on a card (2.45:1), the accent in a column (2.68:1), the accent ' +
          'on the ground (3.15:1) and the accent under the pointer (2.03:1). Text needs 4.5:1. ' +
          'Hard to see: the mark round a word found (1.26:1). A mark needs 1.4:1.',
      );
    });

    it('names many faint stripes by the faintest, and a pair on the ground under the ground', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await type('Ground', '#9aa3ad');
      await type('Card', '#b9c1ca');

      expect(box('Ground')).toHaveAccessibleDescription(
        'Hard to read: quiet text on the ground (4.08:1). Text needs 4.5:1.',
      );
      expect(box('Card')).toHaveAccessibleDescription(
        'Hard to see: 10 genre stripes, Puzzle the faintest (1.16:1). The faintest stripe any ' +
          'theme has is 1.48:1.',
      );
    });

    it('is a tinted line under the colour, and the theme can still be kept', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      const panel = await openPanel();
      await harbour();

      const warning = within(panel).getByText(/^Hard to read: the accent on a card/);
      expect(warning.parentElement).toHaveClass('bg-danger/10', 'text-xs');
      expect(screen.getByRole('button', { name: 'Keep' })).toBeEnabled();
    });
  });

  describe('the strip of what the board does not show', () => {
    it('draws a delete button, the three ratings, a found word, danger and the delete warning', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      const panel = await openPanel();

      const strip = within(panel).getByText('Not on the board').parentElement!;
      expect(within(strip).getByText('Delete')).toHaveClass('bg-danger', 'text-danger-fg');
      expect(within(strip).getByText('★ 4')).toHaveClass('text-rating-low');
      expect(within(strip).getByText('★ 7')).toHaveClass('text-rating-mid');
      expect(within(strip).getByText('★ 9')).toHaveClass('text-rating-high');
      expect(within(strip).getByText('word')).toHaveClass(...MATCH_MARK.split(' '));
      expect(within(strip).getByText('Couldn’t save')).toHaveClass('text-danger');
      expect(within(strip).getByText('Delete your account?').parentElement).toHaveClass('bg-danger/10');
    });
  });

  describe('closing', () => {
    it('keeps the theme on Keep: worn, stored as yours, chosen, and the keyboard back on the palette', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();
      await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Theme' })).toHaveFocus();
      expect(localStorage.getItem(THEME_KEY)).toBe('mine');
      const kept = JSON.parse(localStorage.getItem(MINE_KEY)!) as Mine;
      expect(kept.from).toBe('dusk');
      expect(kept.scheme).toBe('dark');
      expect(kept.tokens['--surface']).toBe('#2f4a4d');
      expect(Object.keys(kept.tokens)).toHaveLength(20);
      expect(worn('--surface')).toBe('#2f4a4d');

      await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
      expect(screen.getByRole('radio', { name: 'Your own' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'Your own' })).toHaveAccessibleDescription('From Dusk');
    });

    // The corner's × is named Cancel too, as the prototype names it: it does what Cancel does.
    it.each([
      ['Cancel', () => userEvent.click(screen.getAllByRole('button', { name: 'Cancel' }).at(-1)!)],
      ['×', () => userEvent.click(screen.getAllByRole('button', { name: 'Cancel' })[0]!)],
      ['Escape', () => userEvent.keyboard('{Escape}')],
    ])('puts back what you wore on %s, and keeps nothing', async (_name, close) => {
      wearing('ember');
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dusk');

      await close();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
      expect(worn('--surface')).toBe('');
      expect(localStorage.getItem(THEME_KEY)).toBe('ember');
      expect(localStorage.getItem(MINE_KEY)).toBeNull();
      expect(screen.getByRole('button', { name: 'Theme' })).toHaveFocus();
    });

    it('puts back a theme of your own you were wearing, values and all', async () => {
      const forest: Mine = {
        from: 'shelf-dark',
        scheme: 'dark',
        tokens: { ...PALETTES['shelf-dark'].tokens, '--surface': '#1b261f' },
      };
      wearingMine(forest);
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await type('Card', '#2f4a4d');
      expect(worn('--surface')).toBe('#2f4a4d');

      await userEvent.keyboard('{Escape}');

      expect(worn('--surface')).toBe('#1b261f');
      expect(JSON.parse(localStorage.getItem(MINE_KEY)!)).toEqual(forest);
    });

    it('wears what is kept for this visit when storage refuses, and leaves the next load as it was', async () => {
      wearing('ember');
      const setItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === MINE_KEY) {
          throw new Error('denied');
        }
        setItem(key, value);
      });
      renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();
      await userEvent.click(screen.getByRole('button', { name: 'Keep' }));

      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dusk');
      expect(worn('--surface')).toBe('#2f4a4d');
      expect(localStorage.getItem(THEME_KEY)).toBe('ember');

      await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
      expect(screen.getByRole('radio', { name: 'Your own' })).toBeChecked();
    });

    it('puts back what you wore when it goes with neither Keep nor Cancel, as the page under it can', async () => {
      // Back, from a board: the header and the panel in it go, and a theme nobody kept would
      // be left on the root until a reload.
      wearing('ember');
      const { unmount } = renderWithProviders(<ThemeMenu />);
      await openPanel();
      await harbour();
      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('dusk');

      unmount();

      expect(root.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
      expect(worn('--surface')).toBe('');
      expect(localStorage.getItem(MINE_KEY)).toBeNull();
    });

    it('lays an inert, transparent layer over the page, so a press there neither keeps nor cancels', async () => {
      wearing('frost');
      renderWithProviders(<ThemeMenu />);
      await openPanel();

      const layer = document.querySelector('[data-backdrop]');
      expect(layer).toHaveClass('fixed', 'inset-0', 'z-10');
      expect(layer).not.toHaveClass('bg-scrim');
      expect(layer).toHaveAttribute('aria-hidden', 'true');
      await userEvent.click(layer!);
      expect(screen.getByRole('dialog', { name: 'Your own theme' })).toBeInTheDocument();
    });
  });
});
