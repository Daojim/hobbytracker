import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { ThemeMenu } from './ThemeMenu';
import { MINE_KEY, THEMES, THEME_ATTRIBUTE, THEME_KEY, type Mine } from './theme';

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Theme' }));
};

/** A theme of your own, kept: made from Shelf Dark, as far as the list is concerned. */
const FOREST: Mine = {
  from: 'shelf-dark',
  scheme: 'dark',
  tokens: { '--surface': '#1b261f', '--sunken': '#111a15', '--accent': '#e3b04b' },
};

const keepForest = (chosen: boolean) => {
  localStorage.setItem(MINE_KEY, JSON.stringify(FOREST));
  if (chosen) {
    localStorage.setItem(THEME_KEY, 'mine');
  }
};

/**
 * The themes, out of Settings since #27 and into a control of their own in the header: a palette
 * that opens today's list, names and hints, in a dropdown of its own. The user's answer at the
 * workshop, *to prepare for* #28, which decides the themes' home.
 */
describe('ThemeMenu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute('style');
  });

  it('is a palette named Theme, with the list shut until it is asked for', () => {
    renderWithProviders(<ThemeMenu />);

    const button = screen.getByRole('button', { name: 'Theme' });
    // Named in words for a voice and a tooltip, because the button itself is a drawing.
    expect(button).toHaveAttribute('title', 'Theme');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('offers every theme with its hint, and says which one is on', async () => {
    renderWithProviders(<ThemeMenu />);
    await open();

    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-expanded', 'true');
    const radios = screen.getAllByRole('radio');
    expect(radios.map((radio) => radio.textContent)).toEqual(
      THEMES.map((theme) => `${theme.label}${theme.hint}`),
    );

    // System is the default and so the one checked before anything has been chosen.
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveAccessibleDescription(
      'Follows your device',
    );
    expect(screen.getByRole('radio', { name: 'Ember' })).not.toBeChecked();
  });

  it('applies and remembers a theme, and stays open while you choose', async () => {
    renderWithProviders(<ThemeMenu />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Ember' }));

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
    expect(localStorage.getItem(THEME_KEY)).toBe('ember');
    expect(screen.getByRole('radio', { name: 'Ember' })).toBeChecked();
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();
  });

  it('takes the attribute back off for System, so the device decides again', async () => {
    renderWithProviders(<ThemeMenu />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Console' }));
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it('closes on Escape and hands the keyboard back to the palette', async () => {
    renderWithProviders(<ThemeMenu />);
    await open();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'System' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Theme' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes when a press lands somewhere else', async () => {
    renderWithProviders(
      <div>
        <ThemeMenu />
        <button type="button">Elsewhere</button>
      </div>,
    );
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('closes when pressed again', async () => {
    renderWithProviders(<ThemeMenu />);
    await open();
    await open();

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  /**
   * A theme of your own (#28): a tenth choice once there is one, named for the theme it was made
   * from, and the way to make one or change it under a rule, in the accent.
   */
  describe('with a theme of your own', () => {
    it('offers to make one under the nine, and no tenth until there is one', async () => {
      renderWithProviders(<ThemeMenu />);
      await open();

      expect(screen.getAllByRole('radio')).toHaveLength(THEMES.length);
      expect(screen.queryByRole('radio', { name: 'Your own' })).not.toBeInTheDocument();

      const make = screen.getByRole('button', { name: 'Make your own…' });
      expect(make).toHaveClass('text-accent');
      // Under a rule, outside the radiogroup: it is a way somewhere, not a theme.
      expect(screen.getByRole('radiogroup', { name: 'Theme' })).not.toContainElement(make);
      expect(make.parentElement).toHaveClass('border-t', 'border-line-soft');
    });

    it('offers it as a tenth choice once there is one, named for the theme it is made from', async () => {
      keepForest(false);
      renderWithProviders(<ThemeMenu />);
      await open();

      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(THEMES.length + 1);
      expect(radios.at(-1)).toHaveAccessibleName('Your own');
      expect(radios.at(-1)).toHaveAccessibleDescription('From Shelf Dark');
      expect(radios.at(-1)).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Edit…' })).toHaveClass('text-accent');
      expect(screen.queryByRole('button', { name: 'Make your own…' })).not.toBeInTheDocument();
    });

    it('says it is on when it is', async () => {
      keepForest(true);
      renderWithProviders(<ThemeMenu />);
      await open();

      expect(screen.getByRole('radio', { name: 'Your own' })).toBeChecked();
      expect(screen.getByRole('radio', { name: 'System' })).not.toBeChecked();
    });

    it('wears it when chosen, and remembers the choice', async () => {
      keepForest(false);
      renderWithProviders(<ThemeMenu />);
      await open();
      await userEvent.click(screen.getByRole('radio', { name: 'Your own' }));

      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('shelf-dark');
      expect(document.documentElement.style.getPropertyValue('--surface')).toBe('#1b261f');
      expect(localStorage.getItem(THEME_KEY)).toBe('mine');
      expect(screen.getByRole('radio', { name: 'Your own' })).toBeChecked();
    });

    it('takes it off for another theme, and keeps it there to choose again', async () => {
      keepForest(true);
      renderWithProviders(<ThemeMenu />);
      await open();
      await userEvent.click(screen.getByRole('radio', { name: 'Ember' }));

      expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
      expect(document.documentElement.style.getPropertyValue('--surface')).toBe('');
      expect(localStorage.getItem(MINE_KEY)).not.toBeNull();
      expect(screen.getByRole('radio', { name: 'Your own' })).not.toBeChecked();
      expect(screen.getByRole('button', { name: 'Edit…' })).toBeInTheDocument();
    });
  });
});
