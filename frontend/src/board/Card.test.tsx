import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';
import { libraryItem } from '../test/library';
import { renderWithProviders } from '../test/render';
import type { LogStatus } from '../api/types';

function renderCard(item = libraryItem(), onDrop = vi.fn()) {
  const view = renderWithProviders(<Card item={item} onDrop={onDrop} draggable />, { dnd: true });
  return { ...view, onDrop };
}

describe('Card', () => {
  it('names the title', () => {
    renderCard(libraryItem({ title: 'Hollow Knight' }));

    expect(screen.getByText('Hollow Knight')).toBeInTheDocument();
  });

  it('shows a rating to one decimal, and nothing at all when unrated', () => {
    // 8.5 and 9.6 are the point of storing numeric(3,1) rather than an integer, so a card that
    // rounded to "9" would be throwing away the only reason the column has a decimal place.
    const rated = renderCard(libraryItem({ latestRating: 8.5 }));
    expect(screen.getByRole('img', { name: 'Rated 8.5 out of 10' })).toBeInTheDocument();
    rated.unmount();

    renderCard(libraryItem({ latestRating: null }));
    expect(screen.queryByRole('img', { name: /Rated/ })).not.toBeInTheDocument();
  });

  it('dates the last activity in the journal zone, not the browser one', () => {
    // 02:30 UTC on New Year's Day is 21:30 on the 31st here. The server files that completion
    // under 2025 and so must the card, or the year picker and the board disagree about the
    // same row.
    renderCard(libraryItem({ lastActivity: '2026-01-01T02:30:00+00:00' }));

    expect(screen.getByText('Dec 31, 2025')).toBeInTheDocument();
  });

  it('marks a replay only when there has been more than one pass', () => {
    const replayed = renderCard(libraryItem({ entryCount: 2 }));
    expect(screen.getByRole('img', { name: '2 playthroughs' })).toBeInTheDocument();
    replayed.unmount();

    renderCard(libraryItem({ entryCount: 1 }));
    expect(screen.queryByRole('img', { name: /playthrough/ })).not.toBeInTheDocument();
  });

  it.each<LogStatus>(['Backlog', 'InProgress'])('offers a drop button on %s', (currentStatus) => {
    renderCard(libraryItem({ title: 'Celeste', currentStatus }));

    expect(screen.getByRole('button', { name: 'Drop Celeste' })).toBeInTheDocument();
  });

  it.each<LogStatus>(['Completed', 'Dropped'])(
    'hides the drop button on %s, where it would mean nothing',
    (currentStatus) => {
      renderCard(libraryItem({ title: 'Celeste', currentStatus }));

      expect(screen.queryByRole('button', { name: 'Drop Celeste' })).not.toBeInTheDocument();
    },
  );

  it('reports the title being dropped, not the position it was in', async () => {
    const { onDrop } = renderCard(libraryItem({ mediaId: 42, title: 'Celeste' }));

    await userEvent.click(screen.getByRole('button', { name: 'Drop Celeste' }));

    expect(onDrop).toHaveBeenCalledExactlyOnceWith(42);
  });

  it('shows cover art when there is any, and falls back to an initial when there is not', () => {
    // The image is queried directly rather than by role: the title sits next to it as text, so
    // the cover is decorative and carries an empty alt on purpose.
    const withArt = renderCard(libraryItem({ coverUrl: 'https://images.igdb.com/co2l7l.jpg' }));
    expect(withArt.container.querySelector('img')).toHaveAttribute(
      'src',
      'https://images.igdb.com/co2l7l.jpg',
    );
    withArt.unmount();

    const { container: withoutCover } = renderCard(
      libraryItem({ coverUrl: null, title: 'Hades' }),
    );
    expect(withoutCover.querySelector('img')).toBeNull();
    expect(screen.getByText('H')).toBeInTheDocument();
  });
});
