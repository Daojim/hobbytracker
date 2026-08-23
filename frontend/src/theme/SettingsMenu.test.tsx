import { afterEach, describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { SettingsMenu } from './SettingsMenu';
import { DENSITY_ATTRIBUTE, THEME_ATTRIBUTE } from './theme';

const open = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
};

describe('SettingsMenu', () => {
  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
    document.documentElement.removeAttribute(DENSITY_ATTRIBUTE);
  });

  it('keeps the panel shut until it is asked for', () => {
    renderWithProviders(<SettingsMenu />);

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('offers every theme, and says which one is on', async () => {
    renderWithProviders(<SettingsMenu />);
    await open();

    // System is the default and so the one checked before anything has been chosen.
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ember' })).not.toBeChecked();
  });

  it('applies and remembers a theme', async () => {
    renderWithProviders(<SettingsMenu />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Ember' }));

    expect(document.documentElement.getAttribute(THEME_ATTRIBUTE)).toBe('ember');
    expect(screen.getByRole('radio', { name: 'Ember' })).toBeChecked();
  });

  it('applies and remembers a density', async () => {
    renderWithProviders(<SettingsMenu />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Compact' }));

    expect(document.documentElement.getAttribute(DENSITY_ATTRIBUTE)).toBe('compact');
  });

  it('takes the attribute back off for System, so the OS decides again', async () => {
    renderWithProviders(<SettingsMenu />);
    await open();
    await userEvent.click(screen.getByRole('radio', { name: 'Console' }));
    await userEvent.click(screen.getByRole('radio', { name: 'System' }));

    expect(document.documentElement.hasAttribute(THEME_ATTRIBUTE)).toBe(false);
  });

  it('closes on Escape and hands the keyboard back to the button', async () => {
    // The drawer already establishes this: a control that opens something has to be where focus
    // returns to, or the next Tab starts from the top of the document.
    renderWithProviders(<SettingsMenu />);
    await open();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toHaveFocus();
  });

  it('closes when the click lands somewhere else', async () => {
    renderWithProviders(
      <div>
        <SettingsMenu />
        <button type="button">Elsewhere</button>
      </div>,
    );
    await open();

    await userEvent.click(screen.getByRole('button', { name: 'Elsewhere' }));

    expect(screen.queryByRole('radiogroup', { name: 'Theme' })).not.toBeInTheDocument();
  });

  it('stays open while you are choosing, because the two settings are usually set together', async () => {
    renderWithProviders(<SettingsMenu />);
    await open();

    await userEvent.click(screen.getByRole('radio', { name: 'Shelf Dark' }));

    expect(screen.getByRole('radiogroup', { name: 'Density' })).toBeInTheDocument();
  });
});
