import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearPicker } from './YearPicker';
import { boardServer } from '../test/library';
import { renderWithProviders } from '../test/render';

describe('YearPicker', () => {
  it('offers the years the API says have completions, newest first, plus all of them', async () => {
    // The API derives these from the same projection the Completed column uses, so it can never
    // offer a year that turns out to be empty. Sorting them here would only risk disagreeing.
    boardServer({ years: [2026, 2024] });

    renderWithProviders(<YearPicker hobby="games" value={undefined} onChange={vi.fn()} />);

    const select = await screen.findByRole('combobox', { name: 'Completed year' });
    expect([...select.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      'All years',
      '2026',
      '2024',
    ]);
  });

  it('reports a year as a number, which is what the query string wants', async () => {
    const onChange = vi.fn();
    boardServer({ years: [2026, 2024] });

    renderWithProviders(<YearPicker hobby="games" value={undefined} onChange={onChange} />);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Completed year' }),
      '2024',
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith(2024);
  });

  it('reports no year at all for "All years", rather than a zero or an empty string', async () => {
    const onChange = vi.fn();
    boardServer({ years: [2026] });

    renderWithProviders(<YearPicker hobby="games" value={2026} onChange={onChange} />);
    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: 'Completed year' }),
      'All years',
    );

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });
});
