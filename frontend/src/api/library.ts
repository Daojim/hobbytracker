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
  /** Omitted entirely when absent, not sent empty. Which columns get one is `yearFor`. */
  year?: number;
  /** Defaults to `manual` server-side, which is the only mode dragging is offered in. */
  sort?: LibrarySort;
  page?: number;
  pageSize?: number;
}

export function listColumn(query: ColumnQuery): Promise<PagedResult<LibraryItem>> {
  return apiJson<PagedResult<LibraryItem>>('/api/library', { query: { ...query } });
}

/**
 * Years with any activity, newest first — the year picker's options.
 *
 * Any activity rather than completions alone, because the year narrows three of the five
 * columns now and Playing is narrowed by a start. A year you began something in and finished
 * nothing in has to be offerable, or the picker cannot ask for a board the columns would answer.
 */
export function activityYears(hobby: string): Promise<number[]> {
  return apiJson<number[]>('/api/library/years', { query: { hobby } });
}

/**
 * The release calendar under the board: your Backlog entries whose title is not out yet,
 * soonest first with the ones nobody has announced a date for last.
 *
 * The same rows the Backlog column answers with, read the other way round — which is what makes
 * a title arrive in Backlog on release day without anything having run.
 *
 * Not paged, unlike every other list here. What a person is waiting for is tens of titles, so
 * the whole answer arrives at once and the section's *show the rest* toggle costs no request.
 */
export function upcoming(hobby: string): Promise<LibraryItem[]> {
  return apiJson<LibraryItem[]>('/api/library/upcoming', { query: { hobby } });
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
 * Puts a title on your board, in a column — what a tile's +, ▶ and ✓ call.
 *
 * The column is the whole request, as it is for `transition`. The first pass carries the dates a
 * drag into that column would give it — Playing starts today, Completed finishes today — and the
 * server works those out by the drag's own rule, so they cannot drift from what a drag does.
 * Answers with the card as the board will draw it; a title already on your board is a 409, since
 * a second pass would be a replay nobody made.
 */
export function addToBoard(mediaId: number, status: LogStatus): Promise<LibraryItem> {
  return apiJson<LibraryItem>(`/api/library/${mediaId}`, { method: 'POST', body: { status } });
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

/** A title on your board, and the column it is in. */
export interface OnBoard {
  mediaId: number;
  status: LogStatus;
}

/**
 * Every title you have logged something against, and which column each is in.
 *
 * A tile needs to know whether a title is on your board already, and where — it says
 * *Completed* rather than offering to add it again — and there is no endpoint that answers that
 * for one title. So it asks for the whole library once and keeps the answer in the query cache.
 * The column costs nothing: every row it reads carries it.
 *
 * Paged through to the end rather than capped at the API's maximum page: a library of 101 titles
 * would otherwise offer to add the hundred-and-first a second time.
 */
export async function libraryStatuses(hobby: string): Promise<OnBoard[]> {
  const titles: OnBoard[] = [];

  // A page is at most 100 (Paging.MaxPageSize), so this bounds the walk at 5,000 titles — far
  // past personal-catalogue scale, and a stop if the server ever disagrees with itself about
  // how many there are.
  for (let page = 1; page <= 50; page += 1) {
    const result = await apiJson<PagedResult<LibraryItem>>('/api/library', {
      query: { hobby, page, pageSize: 100 },
    });

    titles.push(
      ...result.items.map((item) => ({ mediaId: item.mediaId, status: item.currentStatus })),
    );

    if (result.items.length === 0 || titles.length >= result.total) {
      break;
    }
  }

  return titles;
}
