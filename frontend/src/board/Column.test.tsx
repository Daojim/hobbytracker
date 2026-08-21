import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { Column } from './Column';
import { server } from '../test/server';
import { boardServer, libraryItem } from '../test/library';
import { renderWithProviders } from '../test/render';
import type { LibrarySort, LogStatus } from '../api/types';

function renderColumn(
  props: Partial<Parameters<typeof Column>[0]> & { status: LogStatus; label: string },
) {
  return renderWithProviders(
    <Column
      hobby="games"
      sort="manual"
      onSortChange={vi.fn()}
      onDrop={vi.fn()}
      onOpen={vi.fn()}
      {...props}
    />,
    { dnd: true },
  );
}

describe('Column', () => {
  it('asks for its own column of its own hobby, and makes one request to do it', async () => {
    const board = boardServer({ columns: { InProgress: [libraryItem({ title: 'Hades' })] } });

    renderColumn({ status: 'InProgress', label: 'Playing' });
    await screen.findByText('Hades');

    const [query, ...rest] = board.queriesFor('InProgress');
    expect(rest).toHaveLength(0);
    expect(query?.get('hobby')).toBe('games');
    expect(query?.get('status')).toBe('InProgress');
  });

  it('sends no year unless it has been given one', async () => {
    // Backlog and Playing ignore the year picker, and they do it by simply not asking. A
    // `year=` they did send would narrow them to the titles finished that year, which is empty.
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Celeste');

    expect(board.queriesFor('Backlog')[0]?.has('year')).toBe(false);
  });

  it('narrows to a year when one is chosen', async () => {
    const board = boardServer({ columns: { Completed: [libraryItem({ title: 'Outer Wilds' })] } });

    renderColumn({ status: 'Completed', label: 'Completed', year: 2026, onYearChange: vi.fn() });
    await screen.findByText('Outer Wilds');

    expect(board.queriesFor('Completed')[0]?.get('year')).toBe('2026');
  });

  it.each<LibrarySort>(['manual', 'added', 'title', 'rating'])('passes the %s sort through', async (sort) => {
    const board = boardServer({ columns: { Backlog: [libraryItem({ title: 'Celeste' })] } });

    renderColumn({ status: 'Backlog', label: 'Backlog', sort });
    await screen.findByText('Celeste');

    expect(board.queriesFor('Backlog')[0]?.get('sort')).toBe(sort);
  });

  it('counts what the collection holds, not what fits on the page', async () => {
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByRole('heading', { name: 'Backlog 2' })).toBeInTheDocument();
  });

  it('says so when the page does not hold the whole column', async () => {
    boardServer();
    server.use(
      http.get('/api/library', () =>
        HttpResponse.json({
          items: [libraryItem({ title: 'Celeste' })],
          total: 140,
          page: 1,
          pageSize: 100,
        }),
      ),
    );

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Showing 1 of 140')).toBeInTheDocument();
  });

  it('says the column is empty rather than showing nothing at all', async () => {
    boardServer();

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Nothing here yet.')).toBeInTheDocument();
  });

  it('renders a card per title', async () => {
    boardServer({
      columns: { Backlog: [libraryItem({ title: 'Celeste' }), libraryItem({ title: 'Hades' })] },
    });

    renderColumn({ status: 'Backlog', label: 'Backlog' });

    expect(await screen.findByText('Celeste')).toBeInTheDocument();
    expect(screen.getByText('Hades')).toBeInTheDocument();
  });

  it('offers a year picker only when it has somewhere to report one', async () => {
    boardServer({ years: [2026] });

    const { unmount } = renderColumn({
      status: 'Completed',
      label: 'Completed',
      onYearChange: vi.fn(),
    });
    expect(await screen.findByRole('combobox', { name: 'Completed year' })).toBeInTheDocument();
    unmount();

    renderColumn({ status: 'Backlog', label: 'Backlog' });
    await screen.findByText('Nothing here yet.');
    expect(screen.queryByRole('combobox', { name: 'Completed year' })).not.toBeInTheDocument();
  });

  it('keeps its count visible while collapsed, and hides only the cards', async () => {
    boardServer({ columns: { Dropped: [libraryItem({ title: 'Anthem' })] } });

    const { container } = renderColumn({
      status: 'Dropped',
      label: 'Dropped',
      collapsed: true,
      onToggleCollapse: vi.fn(),
    });

    expect(await screen.findByRole('heading', { name: 'Dropped 1' })).toBeInTheDocument();
    expect(screen.queryByText('Anthem')).not.toBeInTheDocument();
    expect(within(container).getByRole('button', { name: 'Show Dropped' })).toBeInTheDocument();
  });
});
