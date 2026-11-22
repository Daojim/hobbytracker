/**
 * The app's one arrow: the journal heading's column control, and since #29 each column's collapse.
 *
 * Pointing down, in the text's colour, 10 by 6 with a 1.5 stroke. A collapsed column turns it a
 * quarter to point right (`-rotate-90`), the disclosure triangle's convention, which was picked
 * from renders on 22 November 2026 over a filled triangle, a second arrow the app would have had.
 * Here rather than in either place, so the board does not reach into the journal for it and the
 * two cannot drift apart.
 */
export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 10 6" className={`h-1.5 w-2.5 shrink-0 ${className}`}>
      <path
        d="M1 1l4 4 4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
