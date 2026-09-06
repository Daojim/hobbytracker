import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { SortSelect } from './SortSelect';

describe('SortSelect', () => {
  it('offers the read-only views under names a person recognises', () => {
    render(
      <SortSelect label="Backlog" lengthLabel="Time to beat" value="manual" onChange={vi.fn()} />,
    );

    const select = screen.getByRole('combobox', { name: 'Backlog order' });
    expect(
      [...select.querySelectorAll('option')].map((option) => option.textContent),
    ).toEqual(['My order', 'Recently added', 'Title', 'Rating', 'Time to beat']);
  });

  it('reports the wire value, not the label', async () => {
    // `manual` is the protocol and "My order" is the label; LibrarySort is what the API parses.
    const onChange = vi.fn();
    render(
      <SortSelect label="Backlog" lengthLabel="Time to beat" value="manual" onChange={onChange} />,
    );

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rating');

    expect(onChange).toHaveBeenCalledExactlyOnceWith('rating');
  });

  it('wears the word this hobby uses for the length mode', () => {
    // The label moves and the wire value does not: sort=length is the same request from either
    // board, ordering on the same field.
    render(<SortSelect label="Watched" lengthLabel="Runtime" value="manual" onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Watched order' });
    expect(
      [...select.querySelectorAll('option')].map((option) => option.textContent),
    ).toEqual(['My order', 'Recently added', 'Title', 'Rating', 'Runtime']);
  });

  it('shows the mode currently in force', () => {
    render(
      <SortSelect label="Completed" lengthLabel="Time to beat" value="title" onChange={vi.fn()} />,
    );

    expect(screen.getByRole('combobox', { name: 'Completed order' })).toHaveValue('title');
  });
});
