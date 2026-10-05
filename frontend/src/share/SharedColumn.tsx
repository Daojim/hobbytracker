import { CARD_CLASS, CardFace } from '../board/Card';
import { ColumnFrame } from '../board/Column';
import type { LibrarySort, LogStatus } from '../api/types';
import { sharedColumnQuery } from './queries';

export interface SharedColumnProps {
  token: string;
  hobby: string;
  status: LogStatus;
  label: string;
  sort: LibrarySort;
  onSortChange: (sort: LibrarySort) => void;
  year?: number;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  namedAbove?: boolean;
}

/**
 * A column of a share: the board's own frame — heading, count, hours, fold and sort, in the
 * share's words — around cards with nothing in their hands.
 *
 * **Each card is its face and nothing else**, exactly as the drag preview draws one: no title to
 * open, no options corner, no sortable registered, so nothing can be pressed, carried, or dropped
 * onto. And **no note line**: a share's answers carry no note, and the face is handed none, so a
 * note that ever arrived would still not be printed. A note is the journal, and a share is the
 * board.
 */
export function SharedColumn({
  token,
  hobby,
  status,
  label,
  sort,
  onSortChange,
  year,
  collapsed,
  onToggleCollapse,
  namedAbove,
}: SharedColumnProps) {
  return (
    <ColumnFrame
      hobby={hobby}
      status={status}
      label={label}
      sort={sort}
      onSortChange={onSortChange}
      collapsed={collapsed}
      onToggleCollapse={onToggleCollapse}
      namedAbove={namedAbove}
      request={sharedColumnQuery(token, status, sort, year)}
      voice="shared"
      pace={null}
    >
      {(items) => (
        <ul className="flex flex-col gap-cardgap">
          {items.map((item) => (
            <li key={item.mediaId} className={CARD_CLASS}>
              <CardFace item={{ ...item, latestNotePreview: null }} />
            </li>
          ))}
        </ul>
      )}
    </ColumnFrame>
  );
}
