import { useEffect, useId, useRef } from 'react';
import { useModalPanel } from '../lib/useModalPanel';
import type { HiddenTitle } from '../api/types';

export interface HiddenDialogProps {
  /** The games you hid, the newest hide first, as the server orders them. */
  titles: readonly HiddenTitle[];
  /** Takes a hide back. The row goes once the server has it. */
  onShow: (mediaId: number) => void;
  /** Why the last Show again failed, if it did. */
  error: Error | null;
  onClose: () => void;
}

/**
 * The games you hid from Discover, opened from *1 hidden* by the way back to the board: a cover and
 * a name a row, the newest hide first, and *Show again* on each. Picked at the #23 workshop on
 * 13 November 2026 over a row in Settings, which grew that panel from 1,009px to 1,116 and put
 * *Your data* below a 900px fold.
 *
 * The share dialog's frame — 448px across, high on the screen, the journal's scrim — with its
 * keyboard, `useModalPanel`, borrowed whole. A row is the column header's list of what it leaves
 * out: a cover 24px wide and a name, here with the button beside it.
 */
export function HiddenDialog({ titles, onShow, error, onClose }: HiddenDialogProps) {
  const titleId = useId();
  const panel = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const done = useRef<HTMLButtonElement>(null);
  useModalPanel(panel, onClose);

  // The row whose Show again was pressed, and where it stood. When it goes, the keyboard goes to
  // the row that took its place — or the last, or Done once there are none — rather than falling
  // out of the dialog onto the page behind, which the next Tab would walk. Only when it fell with
  // the row: somebody who has moved on meanwhile keeps their place.
  const pressed = useRef<{ mediaId: number; index: number } | null>(null);

  useEffect(() => {
    const was = pressed.current;

    if (was === null || titles.some((title) => title.mediaId === was.mediaId)) {
      return;
    }

    pressed.current = null;

    if (document.activeElement !== null && document.activeElement !== document.body) {
      return;
    }

    const rows = list.current?.querySelectorAll('button') ?? [];
    (rows[Math.min(was.index, rows.length - 1)] ?? done.current)?.focus();
  }, [titles]);

  return (
    <>
      {/* The journal's scrim, as the share dialog has it: a press on it closes the dialog. */}
      <div role="presentation" onClick={onClose} className="fixed inset-0 z-40 bg-scrim" />

      <div className="pointer-events-none fixed inset-0 z-40 flex items-start justify-center overflow-y-auto p-4 pt-[12vh]">
        <section
          ref={panel}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="pointer-events-auto w-full max-w-md rounded-xl border border-line bg-surface p-5 text-fg shadow-xl outline-none"
        >
          <h2 id={titleId} className="text-lg font-semibold">
            Hidden from Discover
          </h2>
          <p className="mt-1 text-sm text-muted">
            None of these is offered on any Discover list. Search still finds them.
          </p>

          {titles.length === 0 ? (
            // Only once every one has been shown again with the dialog open, since the way in is a
            // count that is not drawn at nought.
            <p className="mt-4 text-sm text-muted">Nothing hidden.</p>
          ) : (
            // Scrolled within itself past half the screen, so Done stays where it is.
            <ul ref={list} className="mt-4 flex max-h-[50vh] flex-col overflow-y-auto">
              {titles.map((title, index) => (
                <li key={title.mediaId} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-hover">
                  {title.coverUrl === null ? (
                    <span aria-hidden="true" className="h-8 w-6 shrink-0 rounded-sm bg-hover" />
                  ) : (
                    // Empty alt: the name is beside it.
                    <img src={title.coverUrl} alt="" className="h-8 w-6 shrink-0 rounded-sm object-cover" />
                  )}
                  <span className="line-clamp-2 min-w-0 flex-1 text-sm">{title.title}</span>
                  <button
                    type="button"
                    onClick={() => {
                      pressed.current = { mediaId: title.mediaId, index };
                      onShow(title.mediaId);
                    }}
                    aria-label={`Show ${title.title} on Discover again`}
                    className="shrink-0 rounded border border-line px-2 py-0.5 text-xs font-medium text-muted hover:bg-hover hover:text-fg"
                  >
                    Show again
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error !== null && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error.message}
            </p>
          )}

          <div className="mt-5 flex justify-end">
            <button
              ref={done}
              type="button"
              onClick={onClose}
              className="rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover"
            >
              Done
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
