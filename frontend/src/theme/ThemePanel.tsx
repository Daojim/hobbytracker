import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { hobbyDefinition } from '../hobbies';
import { MATCH_MARK } from '../lib/Marked';
import { useModalPanel } from '../lib/useModalPanel';
import { HOBBIES } from '../shell/hobbies';
import { derive } from './derive';
import { STRIPE_FLOOR, faintStripes, measure, type Part } from './pairs';
import { PALETTES, STRIPES } from './palettes';
import {
  THEMES,
  applyMine,
  type Mine,
  type NamedTheme,
  type Picks,
  type ThemeChoice,
  type Tokens,
} from './theme';

/**
 * Where a theme of your own is made (#28): a panel beside the board, the journal drawer's box with
 * no scrim, so the board wears each colour as it is picked; on a phone, a sheet over half the
 * screen, which keeps the column switcher and the top of a card in view above it. Three colours,
 * the ground, the card and the accent, each the browser's swatch and a box for a typed or pasted
 * colour; Made from, the theme the other seventeen are worked out from; a warning under a colour
 * for whatever cannot be read on it; and a strip of what the board does not show.
 *
 * Every choice was picked at the #28 workshop on 21 November 2026, from renders of the shipped
 * board with the prototype `ThemePanelProto.tsx` swapped in, and this is its markup class for
 * class. Loaded when it is first asked for, because it reads index.css as text for the eight
 * themes' values (`palettes.ts`), which nobody else needs.
 *
 * Cancel, the corner's × and Escape put back what was worn, a theme of your own included, and
 * keep nothing; Keep keeps the theme, chooses it, and hands the keyboard back to the palette. A
 * press on the board does nothing while the panel is open, since with no scrim nothing says
 * whether it would keep or cancel: an inert, transparent layer lies over the page.
 */

const PARTS: readonly { key: Part; name: 'Ground' | 'Card' | 'Accent'; paints: string }[] = [
  { key: 'sunken', name: 'Ground', paints: 'The page behind the board' },
  { key: 'surface', name: 'Card', paints: 'Cards, panels and dialogs' },
  { key: 'accent', name: 'Accent', paints: 'Links, focus and the current choice' },
];

const labelOf = (theme: NamedTheme) => THEMES.find((each) => each.value === theme)!.label;

/** The eight, in the palette's order. */
const BASES = THEMES.filter((theme) => theme.value !== 'system').map((theme) => theme.value);

const HEX = /^#[0-9a-f]{6}$/;

/** A colour a person typed or pasted, which is taken when it is whole, in either case. */
const TYPED = /^#[0-9a-fA-F]{6}$/;

/** A theme's own three colours. */
const picksOf = (theme: NamedTheme): Picks => ({
  sunken: PALETTES[theme].tokens['--sunken'],
  surface: PALETTES[theme].tokens['--surface'],
  accent: PALETTES[theme].tokens['--accent'],
});

/** The theme System is showing, which is Shelf Dark's values on a dark device. */
const showing = (): NamedTheme =>
  typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'shelf-dark'
    : 'shelf-light';

/**
 * Where the panel starts: the theme of your own that is kept, its base and its three colours, for
 * Edit…; or the first time, the theme you wear, or for System the one it is showing, with its own
 * three, so nothing on the board changes until a colour is picked.
 */
function startFrom(kept: Mine | null, wearing: ThemeChoice): { from: NamedTheme; picks: Picks } {
  if (kept !== null) {
    const own = (part: Part) => {
      const value = kept.tokens[`--${part}`];
      return value !== undefined && HEX.test(value) ? value : PALETTES[kept.from].tokens[`--${part}`];
    };
    return {
      from: kept.from,
      picks: { sunken: own('sunken'), surface: own('surface'), accent: own('accent') },
    };
  }

  const from = wearing === 'system' || wearing === 'mine' ? showing() : wearing;
  return { from, picks: picksOf(from) };
}

/**
 * A stripe's genre as a card prints it, from the first built board that paints it: *Horror*,
 * *Role-playing (RPG)*. The workshop's prototype named a stripe by its token, which reads the same
 * for the two its renders showed, Horror and Puzzle, and as *Rpg* for that one.
 */
const GENRE_NAMES = new Map<string, string>();
for (const hobby of HOBBIES) {
  if (!hobby.ready) {
    continue;
  }
  for (const genre of hobbyDefinition(hobby.slug).genres) {
    const token = genre.stripe?.replace(/^bg-genre-/, '');
    if (token !== undefined && !GENRE_NAMES.has(token)) {
      GENRE_NAMES.set(token, genre.name);
    }
  }
}
const genreName = (token: string) =>
  GENRE_NAMES.get(token) ?? token.replace(/-/g, ' ').replace(/^./, (first) => first.toUpperCase());

/** One thing that will be hard to make out, and the colour a person sets that it answers to. */
interface Problem {
  readonly by: Part;
  /** Text is read; a mark and a stripe are only seen, each against a floor of its own. */
  readonly kind: 'text' | 'mark' | 'stripe';
  readonly words: string;
  readonly ratio: number;
  readonly min: number;
}

function problemsOf(tokens: Tokens): Problem[] {
  const found: Problem[] = measure(tokens)
    .filter((each) => !each.ok)
    .map(({ pair, ratio }) => ({ by: pair.by, kind: pair.kind, words: pair.words, ratio, min: pair.min }));

  const faint = faintStripes(tokens['--surface'], STRIPES);
  const faintest = faint[0];
  if (faintest !== undefined) {
    const name = genreName(faintest.name);
    found.push({
      by: 'surface',
      kind: 'stripe',
      words:
        faint.length === 1
          ? `the ${name} genre stripe`
          : `${faint.length} genre stripes, ${name} the faintest`,
      ratio: faintest.ratio,
      min: STRIPE_FLOOR,
    });
  }

  return found;
}

const ratio = (value: number) => `${value.toFixed(2)}:1`;

/** *the accent on a card (2.45:1), the accent in a column (2.68:1) and …* */
function sentence(problems: readonly Problem[]): string {
  const parts = problems.map((each) => `${each.words} (${ratio(each.ratio)})`);
  return parts.length === 1
    ? parts[0]!
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/**
 * The warning's words: what is hard to read, against text's bar, and then what is hard to see,
 * against the floor each was picked at. Ratios to two places.
 */
function said(problems: readonly Problem[]): string {
  const read = problems.filter((each) => each.kind === 'text');
  const seen = problems.filter((each) => each.kind !== 'text');
  const out: string[] = [];

  if (read.length > 0) {
    out.push(`Hard to read: ${sentence(read)}. Text needs ${read[0]!.min}:1.`);
  }
  if (seen.length > 0) {
    const floors = seen.map((each) =>
      each.kind === 'mark'
        ? `A mark needs ${each.min}:1.`
        : `The faintest stripe any theme has is ${each.min}:1.`,
    );
    out.push(`Hard to see: ${sentence(seen)}. ${[...new Set(floors)].join(' ')}`);
  }

  return out.join(' ');
}

function Warning({ id, problems }: { id: string; problems: readonly Problem[] }) {
  return (
    <div className="mt-1.5 flex gap-1.5 rounded bg-danger/10 px-2 py-1.5 text-xs text-fg">
      <span aria-hidden="true">⚠</span>
      <p id={id}>{said(problems)}</p>
    </div>
  );
}

interface ControlProps {
  part: (typeof PARTS)[number];
  value: string;
  onPick: (value: string) => void;
  base: NamedTheme;
  /** The id of the warning under this colour, which both its controls are described by. */
  warning: string | undefined;
}

/**
 * One colour: the browser's swatch, and a box beside it that takes a typed or pasted colour the
 * same whatever a browser's picker does, and names a dark card's colour, which its own swatch
 * on the card all but hides. The box is taken only once it holds a whole `#rrggbb`; until then it
 * holds what was typed, and the theme stays as it was.
 */
function Control({ part, value, onPick, base, warning }: ControlProps) {
  const ids = useId();
  const [draft, setDraft] = useState(value);

  // The box follows a colour picked anywhere else: the swatch, Start again, a colour typed and
  // taken, written as the theme keeps it.
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setDraft(value);
  }

  const own = value === PALETTES[base].tokens[`--${part.key}`];

  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3">
        <label htmlFor={`${ids}-hex`} className="text-sm font-medium">
          {part.name}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id={`${ids}-swatch`}
            type="color"
            value={value}
            onChange={(event) => onPick(event.target.value)}
            aria-label={part.name}
            aria-describedby={warning}
            className="h-8 w-12 shrink-0 cursor-pointer rounded border border-line bg-surface p-0.5"
          />
          <input
            id={`${ids}-hex`}
            type="text"
            value={draft}
            spellCheck={false}
            maxLength={7}
            aria-describedby={warning}
            onChange={(event) => {
              setDraft(event.target.value);
              if (TYPED.test(event.target.value)) {
                onPick(event.target.value.toLowerCase());
              }
            }}
            className="w-24 rounded border border-line bg-sunken px-2 py-1 font-mono text-sm text-fg"
          />
        </div>
      </div>
      <p className="mt-0.5 pl-[5.25rem] text-xs text-muted">
        {part.paints}
        {own ? `, as ${labelOf(base)}’s` : ''}
      </p>
    </div>
  );
}

/**
 * What a theme is held to that the board does not show at rest: a delete button, the three
 * ratings, a word a note search found, danger's text and the delete warning. 96px, and 124 on a
 * phone, as the workshop measured it.
 */
function Strip() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">Not on the board</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="rounded bg-danger px-2 py-0.5 font-semibold text-danger-fg">Delete</span>
        <span className="flex gap-2 font-semibold tabular-nums">
          <span className="text-rating-low">★ 4</span>
          <span className="text-rating-mid">★ 7</span>
          <span className="text-rating-high">★ 9</span>
        </span>
        <span>
          a <mark className={MATCH_MARK}>word</mark> found
        </span>
        <span className="text-danger">Couldn’t save</span>
      </div>
      <div className="rounded bg-danger/10 px-2 py-1 text-xs">
        <p className="text-fg">Delete your account?</p>
        <p className="text-muted">The nightly backups keep a copy for about two weeks.</p>
      </div>
    </div>
  );
}

export interface ThemePanelProps {
  /** The theme of your own kept in this browser, which Edit… opens on, or null for none yet. */
  kept: Mine | null;
  /** What the palette has chosen, for the first time, which starts from the theme it shows. */
  wearing: ThemeChoice;
  /** Keep: the theme made. It is already worn. */
  onKeep: (mine: Mine) => void;
  /** Cancel, the × and Escape: put back what was worn, and close. */
  onCancel: () => void;
  /** Put back what was worn without closing: the panel going away with neither pressed. */
  onLeave: () => void;
}

export function ThemePanel({ kept, wearing, onKeep, onCancel, onLeave }: ThemePanelProps) {
  const start = useMemo(() => startFrom(kept, wearing), [kept, wearing]);
  const [from, setFrom] = useState(start.from);
  const [picks, setPicks] = useState<Picks>(start.picks);

  const made = useMemo(() => derive(PALETTES[from], picks), [from, picks]);
  const problems = useMemo(() => problemsOf(made.tokens), [made]);

  // The board beside the panel wears each change as it is made: about 4ms a repaint, measured
  // at the workshop on the 719-element board, in both engines.
  useEffect(() => {
    applyMine({ from, scheme: made.scheme, tokens: made.tokens });
  }, [from, made]);

  // Gone with neither Keep nor Cancel pressed, as the page under it can go (Back, from a board),
  // the theme on the root is a theme nobody kept: what was worn goes back on.
  const decided = useRef(false);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  }, [onLeave]);
  useEffect(
    () => () => {
      if (!decided.current) {
        leave.current();
      }
    },
    [],
  );

  const cancel = useCallback(() => {
    decided.current = true;
    onCancel();
  }, [onCancel]);

  const keep = () => {
    decided.current = true;
    onKeep({ from, scheme: made.scheme, tokens: made.tokens });
  };

  const panel = useRef<HTMLElement>(null);
  useModalPanel(panel, cancel);

  const titleId = useId();
  const fromId = useId();
  const warnings = useId();

  const pick = (key: Part) => (value: string) => setPicks((was) => ({ ...was, [key]: value }));

  return (
    <>
      <div data-backdrop="" className="fixed inset-0 z-10" aria-hidden="true" />
      <section
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-20 flex max-h-[50vh] flex-col gap-4 overflow-y-auto rounded-t-xl border-t border-line bg-surface p-4 text-fg shadow-xl outline-none md:inset-x-auto md:inset-y-0 md:right-0 md:max-h-none md:w-full md:max-w-md md:rounded-none md:border-t-0 md:border-l md:p-5 2xl:max-w-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Your own theme
            </h2>
            <p className="mt-0.5 text-sm text-muted">
              Three colours, and the rest worked out from the theme it is made from.
            </p>
          </div>
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel"
            className="-mt-1 -mr-1 rounded px-2 py-1 text-muted hover:bg-hover hover:text-fg"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3">
          <label htmlFor={fromId} className="text-sm font-medium">
            Made from
          </label>
          <select
            id={fromId}
            value={from}
            onChange={(event) => setFrom(event.target.value as NamedTheme)}
            className="justify-self-start rounded border border-line bg-surface px-2 py-1 text-sm"
          >
            {BASES.map((theme) => (
              <option key={theme} value={theme}>
                {labelOf(theme)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3">
          {PARTS.map((part) => {
            const own = problems.filter((each) => each.by === part.key);
            const id = `${warnings}-${part.key}`;
            return (
              <div key={part.key}>
                <Control
                  part={part}
                  value={picks[part.key]}
                  onPick={pick(part.key)}
                  base={from}
                  warning={own.length > 0 ? id : undefined}
                />
                {own.length > 0 && <Warning id={id} problems={own} />}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setPicks(picksOf(from))}
          className="self-start rounded px-0 text-sm text-accent hover:underline"
        >
          Start again from {labelOf(from)}’s colours
        </button>

        <Strip />

        {/* Pinned to the foot of the sheet as its content scrolls under it: a sticky child of a
            padded scroll box sits as far above the foot as the padding, so it reaches down by
            as much, and its margins with it. */}
        <div className="sticky -bottom-4 -mx-4 -mb-4 mt-auto flex items-center justify-end gap-2 border-t border-line-soft bg-surface px-4 py-3 md:-bottom-5 md:-mx-5 md:-mb-5 md:px-5">
          <button
            type="button"
            onClick={cancel}
            className="rounded px-3 py-1 text-sm text-muted hover:bg-hover hover:text-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={keep}
            className="rounded border border-line px-3 py-1 text-sm font-medium hover:bg-hover"
          >
            Keep
          </button>
        </div>
      </section>
    </>
  );
}
