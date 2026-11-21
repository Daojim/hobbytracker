import { type RefObject, useEffect } from 'react';

/** What Tab can land on. Mirrors the browser's own idea of it closely enough for one panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps a Tab inside a panel: on from its last stop to its first, and back from its first, or from
 * the panel itself, to its last. Anything else is left to the browser, which moves between the
 * stops in between as it would anyway.
 *
 * The modal panels' half, and the ✓'s question's since #24, which is not modal — a press elsewhere
 * closes it — but sits in a portal at the end of the page, where Tab past either end would walk
 * the page from its bottom.
 */
export function keepTabIn(
  panel: HTMLElement,
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>,
) {
  if (event.key !== 'Tab') {
    return;
  }

  const stops = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = stops[0];
  const last = stops[stops.length - 1];
  if (first === undefined || last === undefined) {
    return;
  }

  const here = document.activeElement;
  if (event.shiftKey && (here === first || here === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && here === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * A modal panel's keyboard: it follows the panel in, it cannot Tab out onto the page behind, and
 * Escape closes the panel.
 *
 * The journal's first, and the share dialog's since — one copy, because the two are held to one
 * promise. `aria-modal` tells a screen reader the page behind is inert, and a panel that let Tab
 * walk out onto it would make that false for anyone who reads by tabbing.
 *
 * Escape is heard at the document, where the journal always heard it: focus can fall out of a
 * panel onto the body, and a key pressed then is still meant for the panel.
 *
 * **`active` is false while another panel covers this one**, which the picker is when a pick's
 * name opens the journal over it. It stays mounted, so Back finds the pick where it was, and
 * takes no keys: listening, it would close itself on the Escape meant for the journal, and Back
 * would go two steps.
 */
export function useModalPanel(
  panel: RefObject<HTMLElement | null>,
  onClose: () => void,
  active = true,
) {
  // The keyboard follows the panel in. Without this the focus is still on the page behind, and
  // the first Tab walks that rather than the panel that just opened.
  //
  // Without scrolling, since #27: a panel taller than the screen, as Settings is on a phone, is
  // scrolled by the browser so that as much of it shows as can, which took away the 16px it
  // was picked to start under. Every panel opens at its top, so nothing needs the scroll.
  useEffect(() => {
    panel.current?.focus({ preventScroll: true });
  }, [panel]);

  useEffect(() => {
    if (!active) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (panel.current !== null) {
        keepTabIn(panel.current, event);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panel, onClose, active]);
}
