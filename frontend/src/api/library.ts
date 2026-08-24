import { apiJson, apiVoid } from './client';
import type { LibraryItem, LibrarySort, LogStatus, PagedResult, ReorderColumn } from './types';

/**
 * The board: your collection, one column at a time.
 *
 * Each column is its own request. That is what makes "the year picker narrows only Completed"
 * fall out for free — only that column's request carries a year — and it keeps a drag from
 * having to refetch three columns that did not change.
 */

export interface ColumnQuery {
  hobby: string;
  status: LogStatus;
  /** Meaningful only for Completed. Omitted entirely when absent, not sent empty. */
  year?: number;
  /** Defaults to `manual` server-side, which is the only mode dragging is offered in. */
  sort?: LibrarySort;
  page?: number;
  pageSize?: number;
}

export function listColumn(query: ColumnQuery): Promise<PagedResult<LibraryItem>> {
  return apiJson<PagedResult<LibraryItem>>('/api/library', { query: { ...query } });
}

/** Years with completions, newest first — the year picker's options. */
export function completionYears(hobby: string): Promise<number[]> {
  return apiJson<number[]>('/api/library/years', { query: { hobby } });
}

/**
 * Moves a title to a column. What dragging a card calls.
 *
 * The target column is the whole request. Whether that edits the current entry or starts a fresh
 * one, and which timestamps get set, is decided server-side — so this never has to know which
 * entry is current, and replaying a game finished in 2024 cannot overwrite that completion by
 * accident.
 */
export function transition(mediaId: number, status: LogStatus): Promise<LibraryItem> {
  return apiJson<LibraryItem>(`/api/library/${mediaId}/status`, {
    method: 'POST',
    body: { status },
  });
}

/**
 * Takes a title off your board — every pass of yours against it, notes and all.
 *
 * Every pass rather than the newest one, which is what this used to do: a title replayed five
 * times was five presses from leaving, and each press looked like a failure because the card
 * came back in whichever column the pass underneath sat in. Deleting one named pass is the
 * drawer's job, where the pass is on screen with its dates.
 */
export function removeFromBoard(mediaId: number): Promise<void> {
  return apiVoid(`/api/library/${mediaId}`, { method: 'DELETE' });
}

/** Stores a column's manual ranking. Send the whole column, top first. */
export function reorderColumn(order: ReorderColumn): Promise<void> {
  return apiVoid('/api/library/order', { method: 'PUT', body: order });
}

/**
 * Every media id you have logged something against, regardless of column.
 *
 * The search page needs to know what is already on your board, and there is no endpoint that
 * answers "is this one title in my library" — so it asks for the whole thing once and keeps the
 * answer in the query cache. Paged through to the end rather than capped at the API's maximum
 * page: a library of 101 titles would otherwise offer to add the hundred-and-first a second
 * time, and a second Backlog entry reads on the board as a replay that never happened.
 */
export async function libraryMediaIds(hobby: string): Promise<number[]> {
  const ids: number[] = [];

  // A page is at most 100 (Paging.MaxPageSize), so this bounds the walk at 5,000 titles — far
  // past personal-catalogue scale, and a stop if the server ever disagrees with itself about
  // how many there are.
  for (let page = 1; page <= 50; page += 1) {
    const result = await apiJson<PagedResult<LibraryItem>>('/api/library', {
      query: { hobby, page, pageSize: 100 },
    });

    ids.push(...result.items.map((item) => item.mediaId));

    if (result.items.length === 0 || ids.length >= result.total) {
      break;
    }
  }

  return ids;
}
