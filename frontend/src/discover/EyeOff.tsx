/**
 * An eye struck through: the mark that hides a game from Discover, the card a hidden tile becomes,
 * and the page's *1 hidden*. Picked at the #23 workshop over a cross, which elsewhere in the app
 * closes or clears.
 *
 * Drawn rather than typed, at the add symbols' size and close to their stroke, for `AddControl`'s
 * reasons: in the text's colour, hidden from assistive technology because the control's own name
 * says what it does, and `focusable="false"` so no browser makes the drawing a tab stop.
 */
export function EyeOff({ className = 'size-3' }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 8s2.4-4.5 6.5-4.5S14.5 8 14.5 8s-2.4 4.5-6.5 4.5S1.5 8 1.5 8z" />
      <circle cx="8" cy="8" r="2" />
      <path d="M2.5 13.5l11-11" />
    </svg>
  );
}
