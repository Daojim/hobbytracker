import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { SortSelect } from './SortSelect';

describe('SortSelect', () => {
  it('offers the four read-only views under names a person recognises', () => {
    render(<SortSelect label="Backlog" value="manual" onChange={vi.fn()} />);

    const select = screen.getByRole('combobox', { name: 'Backlog order' });
    expect(
      [...select.querySelectorAll('option')].map((option) => option.textContent),
    ).toEqual(['My order', 'Recently added', 'Title', 'Rating']);
  });

  it('reports the wire value, not the label', async () => {
    // `manual` is the protocol and "My order" is the label; LibrarySort is what the API parses.
    const onChange = vi.fn();
    render(<SortSelect label="Backlog" value="manual" onChange={onChange} />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'rating');

    expect(onChange).toHaveBeenCalledExactlyOnceWith('rating');
  });

  it('shows the mode currently in force', () => {
    render(<SortSelect label="Completed" value="title" onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Completed order' })).toHaveValue('title');
  });
});
