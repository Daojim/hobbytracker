import { useEffect, useId, useRef, useState } from 'react';
import { canHide, setColumnHidden, useHiddenColumns } from '../board/hiddenColumns';
import { columnsFor } from '../hobbies';
import type { Hobby } from '../shell/hobbies';
import { DENSITIES, JOURNAL_VIEWS, THEMES } from './theme';
import { useTheme } from './useTheme';

export interface SettingsMenuProps {
  /** The board this panel sits over, whose columns the Columns group lists. */
  hobby: Hobby;
}

/**
 * The one control in the header, holding the appearance preferences and the board's columns.
 *
 * One button rather than two controls side by side: the header would otherwise start collecting
 * them, and there would be nowhere obvious for the next one to go. They are usually set in the
 * same sitting, so choosing one leaves the panel open.
 *
 * Built as radio groups rather than a list of buttons because that is what they are — a closed
 * set where exactly one is current — and it is what lets a screen reader say "System, selected"
 * and place it within a group, instead of reading a row of unrelated buttons. Deliberately not
 * quoting the count here: it said "1 of 5" for a long time while there were seven themes, and a
 * number in a comment nothing checks is a number that goes quietly wrong.
 *
 * The Columns group is the exception on both counts: each column is on or off independently, so
 * they are checkboxes rather than radios; and it is the one setting that is not CSS, so it is read
 * from a store the board subscribes to as well — see `board/hiddenColumns.ts`.
 */
export function SettingsMenu({ hobby }: SettingsMenuProps) {
  const { theme, density, journalView, setTheme, setDensity, setJournalView } = useTheme();
  const hidden = useHiddenColumns(hobby);
  const [open, setOpen] = useState(false);

  const ids = useId();
  const button = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);

  // Escape closes and hands the keyboard back, which is the drawer's rule and for its reason: a
  // control that opened something is where focus belongs when it shuts, or the next Tab starts
  // from the top of the document.
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        button.current?.focus();
      }
    };

    // The container holds the button as well as the panel, so the press that opens the menu is
    // inside it and does not immediately close it again.
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        onClick={() => setOpen((was) => !was)}
        aria-expanded={open}
        className="rounded border border-line px-2 py-1 text-xs font-medium text-muted hover:bg-hover hover:text-fg"
      >
        Settings
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-line bg-surface p-2 shadow-xl">
          <p id={`${ids}-theme`} className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Theme
          </p>
          <div role="radiogroup" aria-labelledby={`${ids}-theme`} className="flex flex-col">
            {THEMES.map((option) => (
              // The hint is a description, not part of the name. Left to be read as content it
              // joins the accessible name — "System Follows your device" — which is both a worse
              // announcement and unmatchable by the name a person would say.
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={theme === option.value}
                aria-labelledby={`${ids}-${option.value}-label`}
                aria-describedby={`${ids}-${option.value}-hint`}
                onClick={() => setTheme(option.value)}
                className="flex items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-hover"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full border ${
                    theme === option.value ? 'border-accent bg-accent' : 'border-line'
                  }`}
                />
                <span id={`${ids}-${option.value}-label`} className="flex-1">
                  {option.label}
                </span>
                <span id={`${ids}-${option.value}-hint`} className="text-xs text-muted">
                  {option.hint}
                </span>
              </button>
            ))}
          </div>

          <hr className="my-2 border-line-soft" />

          <p id={`${ids}-density`} className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Density
          </p>
          <div role="radiogroup" aria-labelledby={`${ids}-density`} className="flex flex-col">
            {DENSITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={density === option.value}
                onClick={() => setDensity(option.value)}
                className="flex items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-hover"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full border ${
                    density === option.value ? 'border-accent bg-accent' : 'border-line'
                  }`}
                />
                {option.label}
              </button>
            ))}
          </div>

          <hr className="my-2 border-line-soft" />

          <p
            id={`${ids}-journal`}
            className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase"
          >
            Journal
          </p>
          <div role="radiogroup" aria-labelledby={`${ids}-journal`} className="flex flex-col">
            {JOURNAL_VIEWS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={journalView === option.value}
                onClick={() => setJournalView(option.value)}
                className="flex items-baseline gap-2 rounded px-2 py-1 text-left text-sm hover:bg-hover"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1 h-2 w-2 shrink-0 rounded-full border ${
                    journalView === option.value ? 'border-accent bg-accent' : 'border-line'
                  }`}
                />
                {option.label}
              </button>
            ))}
          </div>

          <hr className="my-2 border-line-soft" />

          {/* The board's columns, in its own words — Playing here, Watching on a films board —
              and for this board only, because a film is seldom put on hold and a game often is.

              Ticked means shown, and the group never says "hide": on the board that word already
              means *fold*, for Dropped and for the calendar, and a third meaning up here would be
              one too many. Taking a column off draws it nowhere, fetches nothing and offers no
              move to it; every title in it stays where it was.

              Backlog is left out rather than offered as a disabled box. A disabled control
              claims it would work under some other condition — the nav's reason for rendering
              unbuilt hobbies as plain text — and there is none: search adds every title there.
              The line under the group says so in words. */}
          <p
            id={`${ids}-columns`}
            className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase"
          >
            Columns
          </p>
          <div
            role="group"
            aria-labelledby={`${ids}-columns`}
            aria-describedby={`${ids}-columns-note`}
            className="flex flex-col"
          >
            {columnsFor(hobby)
              .filter((column) => canHide(column.status))
              .map((column) => {
                const shown = !hidden.has(column.status);

                // Real checkboxes, where every other group here draws its own dots, and that
                // was chosen from screenshots rather than assumed. Squares drawn to match the
                // dots were the first attempt: at this size a square barely differs from a
                // dot, and an unticked one all but vanished on the dark themes. A tick says
                // "each one on its own" before anything is pressed, which is the difference
                // from the radios above — and `color-scheme`, set per theme in index.css,
                // themes the box itself, with the accent as its fill.
                return (
                  <label
                    key={column.status}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-hover"
                  >
                    <input
                      type="checkbox"
                      checked={shown}
                      onChange={(event) =>
                        setColumnHidden(hobby, column.status, !event.target.checked)
                      }
                      className="accent-accent"
                    />
                    {column.label}
                  </label>
                );
              })}
          </div>
          <p id={`${ids}-columns-note`} className="px-2 pt-0.5 pb-1 text-xs text-muted">
            Backlog always shows, because search adds to it.
          </p>

          <hr className="my-2 border-line-soft" />

          {/* Credits, and the one part of this panel that is a requirement rather than a
              preference. TMDB's API terms ask for this sentence near-verbatim in an About or
              Credits area; the app has no About section, so this panel is it.

              Text rather than their logo, deliberately. The mark has its own rules about size,
              placement and alteration, and a wordmark set as text keeps none of them by accident
              — a sentence cannot breach them at all. IGDB is named beside it because crediting
              one provider and not the other would read as an oversight, though only TMDB asks.

              Not a `<p>` in the same class as the group headings above: those name controls, and
              this names nobody's setting. */}
          <p className="px-2 pt-1 pb-0.5 text-[11px] leading-snug text-muted">
            Game data from IGDB. This product uses the TMDB API but is not endorsed or certified
            by TMDB.
          </p>
        </div>
      )}
    </div>
  );
}
