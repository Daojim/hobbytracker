import { useId, type ReactNode } from 'react';

/**
 * The two kinds of box the Stats page is made of, picked from rendered comparisons on
 * 2 October 2026: four tiles across the top carrying the headline numbers, and panels under them
 * carrying the detail.
 *
 * Each is a region named by its heading, so a screen reader can move between them as a sighted
 * reader moves between boxes — and so a test finds a section by the name a person reads.
 */
interface SectionProps {
  label: string;
  children: ReactNode;
}

/** A headline number on paper, raised as a card is. */
export function Tile({ label, children }: SectionProps) {
  const id = useId();

  return (
    <section aria-labelledby={id} className="rounded-lg bg-surface p-4 shadow-card">
      <h3 id={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </h3>
      {children}
    </section>
  );
}

/** The detail behind the numbers, in the board's own column well. */
export function Panel({ label, children }: SectionProps) {
  const id = useId();

  return (
    <section aria-labelledby={id} className="min-w-0 rounded-xl bg-well p-4">
      <h3 id={id} className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </h3>
      {children}
    </section>
  );
}

/** A tile's figure: the number, or a dash when there is nothing to say, never a nought. */
export function Figure({ value, tone = '' }: { value: string | null; tone?: string }) {
  return value === null ? (
    <p className="mt-1 text-3xl font-semibold text-muted">
      <span aria-hidden="true">—</span>
      <span className="sr-only">No data</span>
    </p>
  ) : (
    <p className={`mt-1 text-3xl font-semibold ${tone}`}>{value}</p>
  );
}

/** The line under a tile's figure. */
export function Under({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-muted">{children}</p>;
}

/** What a panel says when there is nothing to draw. */
export function Nothing({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm text-muted">{children}</p>;
}
