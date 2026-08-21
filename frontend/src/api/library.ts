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

/** Stores a column's manual ranking. Send the whole column, top first. */
export function reorderColumn(order: ReorderColumn): Promise<void> {
  return apiVoid('/api/library/order', { method: 'PUT', body: order });
}
