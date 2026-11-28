import {
  infiniteQueryOptions,
  type DefaultError,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query';
import { COLUMN_PAGE_SIZE } from './keys';
import type { LibraryItem, LibraryPage } from '../api/types';

/**
 * Where one column's answer comes from: your board's library, or a share's. Whichever it is, the
 * column and anything else that needs its answer share it — the phone's switcher counts from it.
 *
 * A page at a time since #35, counted from 1, as the API counts them.
 */
export interface ColumnRequest {
  queryKey: QueryKey;
  queryFn: (page: number) => Promise<LibraryPage>;
}

/**
 * A column's answer as the cache holds it: every page loaded so far, 100 titles each, by page
 * number. One entry per column view, under the view's key, as a single page was before #35.
 */
export type ColumnPages = InfiniteData<LibraryPage, number>;

/**
 * A column's request as the one infinite query every reader of it shares: the column itself, and
 * a phone's switcher counting it. One builder, so two observers of one key cannot disagree about
 * where its pages start or when they end.
 *
 * **A page is found by its number, and there is a next one while the pages so far stop short of
 * the column's count.** The number is the one this side asked with rather than the one an answer
 * echoes, so a page that said the wrong thing about itself cannot keep a column asking for ever.
 *
 * **A refetch asks for every page loaded, and stops early where the column has shrunk**:
 * TanStack's own behaviour, and the workshop's pick. A move, an add, a removal, a write in the
 * journal and the estimates' poll each ask a column again, and a column that went back to its
 * first 100 on each would lose the reader's place. A reload, a new sort or a new year is a new
 * key, and starts at the first 100.
 */
export const columnPages = ({ queryKey, queryFn }: ColumnRequest) =>
  // Every type named, because TanStack's default for the data is pages of an `unknown` number.
  infiniteQueryOptions<LibraryPage, DefaultError, ColumnPages, QueryKey, number>({
    queryKey,
    queryFn: ({ pageParam }) => queryFn(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, _pages, page) =>
      page * COLUMN_PAGE_SIZE < last.total ? page + 1 : undefined,
  });

/**
 * Every card a column has loaded, in order, each once.
 *
 * **A title a later page repeats is dropped**, Discover's rule. Pages are asked for one at a time,
 * so a title added on top between two of them pushes the last card of one page onto the next,
 * which then carries it again. Drawn twice, it would be one media id mounted twice, which leaves
 * the survivor undraggable: see *A card mounted twice* in docs/board.md.
 */
export function cardsOf(column: ColumnPages | undefined): LibraryItem[] {
  const seen = new Set<number>();

  return (column?.pages ?? [])
    .flatMap((page) => page.items)
    .filter((item) => {
      if (seen.has(item.mediaId)) {
        return false;
      }

      seen.add(item.mediaId);
      return true;
    });
}

/**
 * How many titles the column holds, all of them: the count its heading says, a phone's segment
 * says, and the header's hours are over. Every page carries it; the first is read.
 */
export const totalOf = (column: ColumnPages | undefined): number => column?.pages[0]?.total ?? 0;

/**
 * The column with its cards as given and its count as given, written back over the pages it has.
 *
 * Where a page ends is the server's to say on the next refetch, which asks by page number and
 * not by what the cache holds, so the cards only have to be in order: each page keeps its length
 * and the last takes whatever is left, more or fewer. Every page is given the count, so none of
 * them says another.
 */
function repaged(column: ColumnPages, cards: readonly LibraryItem[], total: number): ColumnPages {
  let start = 0;

  return {
    ...column,
    pages: column.pages.map((page, index) => {
      const last = index === column.pages.length - 1;
      const items = last ? cards.slice(start) : cards.slice(start, start + page.items.length);
      start += items.length;
      return { ...page, items, total };
    }),
  };
}

/** A move out: the card off whichever page holds it, and the column a title shorter. */
export const withoutCard = (column: ColumnPages, mediaId: number): ColumnPages =>
  repaged(
    column,
    cardsOf(column).filter((item) => item.mediaId !== mediaId),
    totalOf(column) - 1,
  );

/**
 * A move in: the card where it was let go among the cards loaded, or at their foot when it was
 * let go on no card, and the column a title longer.
 */
export function withCard(column: ColumnPages, card: LibraryItem, index?: number): ColumnPages {
  const cards = cardsOf(column);
  cards.splice(index ?? cards.length, 0, card);
  return repaged(column, cards, totalOf(column) + 1);
}

/** A drag within the column: the cards loaded, in the order named. */
export function reordered(column: ColumnPages, mediaIds: readonly number[]): ColumnPages {
  const byId = new Map(cardsOf(column).map((item) => [item.mediaId, item]));
  return repaged(
    column,
    mediaIds.flatMap((mediaId) => byId.get(mediaId) ?? []),
    totalOf(column),
  );
}
