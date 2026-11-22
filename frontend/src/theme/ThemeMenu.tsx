import { useEffect, useId, useRef, useState } from 'react';
import { THEMES, type NamedTheme, type ThemeChoice } from './theme';
import { useTheme } from './useTheme';

/** A theme's name as the list says it: *Shelf Dark*. */
const labelOf = (theme: NamedTheme) => THEMES.find((each) => each.value === theme)!.label;

/**
 * The themes, as a palette in the header that opens today's list: each theme's name and its hint,
 * in a dropdown of its own under the button.
 *
 * Out of Settings since #27, where the nine took most of the panel's height, which was the user's
 * point in asking for the workshop. Three places were rendered for them, a row opening the list in
 * place of the panel, the same row opening a dialog of swatches, and tabs, and **the user's answer
 * was none of them: a control of their own in the header**, *to prepare for* #28, which makes a
 * theme of your own and decides where the themes finally live.
 *
 * **#28 kept the list**, the recommendation, over the same list with a swatch before each name and
 * #27's dialog of swatches: a theme of your own is a tenth choice in it once there is one, *Your
 * own · From Shelf Dark*, one 28px line with every base, over *Made from Shelf Dark*, which wraps
 * the name at 224px. *Make your own…* sits under a rule before there is one, and *Edit…* after,
 * in the accent, because it is a way somewhere rather than a theme.
 *
 * A palette rather than the word *Theme*, the user's pick from round two over the recommended
 * word: on a 390 phone the word wrapped *Sign out* onto two lines unless the title dropped a size,
 * and two icons keep the header one 32px row with the title at full size. Named *Theme* for a voice
 * and in a tooltip, because the button itself is a drawing.
 *
 * Radios rather than a list of buttons for Settings' old reason: a closed set where exactly one is
 * current, which is what lets a screen reader say "System, selected" and place it in the group.
 * Choosing one leaves the list open, so the next can be tried at once.
 *
 * The only thing that shows or changes the theme, and it has to stay that way: `useTheme` holds
 * its state locally, because themes are CSS and there is no provider, so a second control would
 * read storage once on mount and go on drawing the old choice. `AppHeader.test.tsx` pins one.
 */
export function ThemeMenu() {
  const { theme, mine, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  const choices: readonly { value: ThemeChoice; label: string; hint: string }[] = [
    ...THEMES,
    ...(mine === null ? [] : [{ value: 'mine' as const, label: 'Your own', hint: `From ${labelOf(mine.from)}` }]),
  ];

  const ids = useId();
  const button = useRef<HTMLButtonElement>(null);
  const container = useRef<HTMLDivElement>(null);

  // Escape closes and hands the keyboard back, the drawer's rule for its reason: a control that
  // opened something is where focus belongs when it shuts, or the next Tab starts from the top of
  // the document. A press anywhere else closes it too, without taking the keyboard anywhere.
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

    // The container holds the button as well as the list, so the press that opens the list is
    // inside it and does not close it again at once.
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
        aria-label="Theme"
        title="Theme"
        className={HEADER_ICON_BUTTON}
      >
        <Palette />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 w-56 rounded-lg border border-line bg-surface p-2 shadow-xl">
          <p id={`${ids}-theme`} className="px-2 py-1 text-xs font-semibold tracking-wide text-muted uppercase">
            Theme
          </p>
          <div role="radiogroup" aria-labelledby={`${ids}-theme`} className="flex flex-col">
            {choices.map((option) => (
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
          <div className="mt-1 border-t border-line-soft pt-1">
            <button
              type="button"
              className="w-full rounded px-2 py-1 pl-6 text-left text-sm text-accent hover:bg-hover"
            >
              {mine === null ? 'Make your own…' : 'Edit…'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * The header's two icon buttons, the palette and Settings' gear: Settings' old bordered button with
 * a 16px drawing in place of its word, 34 × 26, as the workshop's prototype measured them.
 */
export const HEADER_ICON_BUTTON =
  'flex items-center rounded border border-line px-2 py-1 text-xs font-medium text-muted hover:bg-hover hover:text-fg';

/** A painter's palette, at Settings' glyph stroke and the header's 16px. */
function Palette() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.75c-3.6 0-6.25 2.6-6.25 5.9 0 3.1 2.5 5.6 5.4 5.6.9 0 1.35-.55 1.35-1.2 0-.7-.5-1-.5-1.65 0-.75.6-1.25 1.4-1.25h1.55c2 0 3.3-1.3 3.3-3.2 0-2.5-2.65-4.2-6.25-4.2z" />
      <circle cx="4.9" cy="7.4" r=".9" fill="currentColor" stroke="none" />
      <circle cx="6.6" cy="4.6" r=".9" fill="currentColor" stroke="none" />
      <circle cx="9.8" cy="4.5" r=".9" fill="currentColor" stroke="none" />
    </svg>
  );
}
