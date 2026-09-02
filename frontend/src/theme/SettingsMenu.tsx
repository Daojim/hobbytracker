import { useEffect, useId, useRef, useState } from 'react';
import { DENSITIES, JOURNAL_VIEWS, THEMES } from './theme';
import { useTheme } from './useTheme';

/**
 * The one control in the header, holding the appearance preferences.
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
 */
export function SettingsMenu() {
  const { theme, density, journalView, setTheme, setDensity, setJournalView } = useTheme();
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
        </div>
      )}
    </div>
  );
}
