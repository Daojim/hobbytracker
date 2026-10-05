import { type RefObject, useEffect } from 'react';

/** What Tab can land on. Mirrors the browser's own idea of it closely enough for one panel. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
 */
export function useModalPanel(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  // The keyboard follows the panel in. Without this the focus is still on the page behind, and
  // the first Tab walks that rather than the panel that just opened.
  useEffect(() => {
    panel.current?.focus();
  }, [panel]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || panel.current === null) {
        return;
      }

      const stops = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
      const first = stops[0];
      const last = stops[stops.length - 1];
      if (first === undefined || last === undefined) {
        return;
      }

      const here = document.activeElement;
      if (event.shiftKey && (here === first || here === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && here === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panel, onClose]);
}
