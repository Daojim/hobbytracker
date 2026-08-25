import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearPicker } from './YearPicker';

// No providers and no MSW: it takes its options as a prop now, so there is nothing to fetch.
describe('YearPicker', () => {
  it('offers the years it was given, in the order it was given them, plus all of them', () => {
    // The API derives these from the same projection the columns filter on, newest first.
    // Re-sorting here would only risk disagreeing with the thing that knows.
    render(<YearPicker years={[2026, 2024]} value={undefined} onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Year' });
    expect([...select.querySelectorAll('option')].map((option) => option.textContent)).toEqual([
      'All years',
      '2026',
      '2024',
    ]);
  });

  it('reports a year as a number, which is what the query string wants', async () => {
    const onChange = vi.fn();
    render(<YearPicker years={[2026, 2024]} value={2026} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Year' }), '2024');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(2024);
  });

  it('reports no year at all for "All years", rather than a zero or an empty string', async () => {
    const onChange = vi.fn();
    render(<YearPicker years={[2026]} value={2026} onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Year' }), 'All years');

    expect(onChange).toHaveBeenCalledExactlyOnceWith(undefined);
  });

  it('shows the year it was given as the one selected', () => {
    // The board decides what that is — the latest year until somebody chooses otherwise — so
    // this has to render the answer it was handed rather than one of its own.
    render(<YearPicker years={[2026, 2024, 2019]} value={2019} onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('2019');
  });
});
