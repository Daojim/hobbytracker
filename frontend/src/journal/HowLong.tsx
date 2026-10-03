import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { formatHours } from '../lib/hours';
import { addDays, daysBetween, formatDayShort } from '../lib/release';
import { todayHere } from '../lib/time';
import {
  daysToFinish,
  describeSpan,
  formatNeeded,
  formatPace,
  hoursLeft,
  hoursNeeded,
  parsePaceInput,
  setPace,
  setPlayStyle,
  usePace,
  type Pace,
  type Per,
} from '../lib/pace';
import { hltbTiers, type HltbEstimates, type HltbTier } from './fields';

/** A pace a press away. Labelled by `formatPace`, so the button says what the answer will. */
const QUICK: readonly Pace[] = [
  { hours: 0.5, per: 'day' },
  { hours: 1, per: 'day' },
  { hours: 2, per: 'day' },
  { hours: 5, per: 'week' },
  { hours: 10, per: 'week' },
];

/**
 * HowLongToBeat's tiers in the words the question asks in, the most modest first.
 *
 * Each button names the tier and its figure beside the words, so nobody has to take the
 * translation on trust. All play styles is last because it is the one that is not a way of
 * playing: it is everybody's times taken together.
 */
const STYLES: readonly { key: HltbTier['key']; words: string }[] = [
  { key: 'hltbMainStoryHours', words: 'Just the story' },
  { key: 'hltbMainExtraHours', words: 'The story and some extras' },
  { key: 'hltbCompletionistHours', words: 'Everything' },
  { key: 'hltbAllStylesHours', words: 'However it goes' },
];

const wordsFor = (key: HltbTier['key']) =>
  STYLES.find((style) => style.key === key)?.words ?? key;

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

const INLINE_INPUT =
  'mx-0.5 inline-block rounded border border-line bg-surface px-1.5 py-0 text-xs text-fg';

const LINK = 'text-xs text-accent hover:underline';

const PILL = 'rounded-full border border-line px-2.5 py-1 text-xs hover:bg-hover';

/**
 * Keeps the question's own changes away from the pass's form, which it sits inside.
 *
 * The form has one `onChange` that hears every field in it — React's change events bubble — and
 * takes "Saved" away when it fires. A pace typed here, or a date to finish by, is not a field of
 * the pass and writes nothing, so "Saved" is still true and must stay on screen.
 */
const keepToItself = (event: ChangeEvent) => event.stopPropagation();

export interface HowLongProps {
  /** Whose pace this is. A pace is per board: an evening of anime is not an evening of games. */
  hobby: string;

  /** HowLongToBeat's figures, which every answer here is worked out from. */
  estimates: HltbEstimates;

  /**
   * Hours played on this pass, as the box shows them now rather than as last saved — so the
   * answer moves as you type, and does not wait out the autosave to agree with the field above.
   */
  played: number | null;

  /** Opened from a card's *How long for me?*, so the question is already asked when it arrives. */
  initiallyOpen?: boolean;
}

/**
 * "How long will it take me?" — the quiz picked at the #4 workshop on 2 October 2026, the user's
 * own idea over a grid of dates under every estimate.
 *
 * A link under HowLongToBeat's figures, which costs the drawer one line at rest. Pressed, it asks
 * how much you play and how you will play this game, then answers with a day: *7 more days —
 * you'd finish around Oct 9.* What you said is kept per board and per browser, so the next game
 * is one press to its answer; and the Backlog column's header reads the same pace to say how long
 * the whole queue would take.
 *
 * The arithmetic is `lib/pace.ts`'s, and the day it lands on is `lib/release.ts`'s, which never
 * lets a zone near a day.
 */
export function HowLong({ hobby, estimates, played, initiallyOpen = false }: HowLongProps) {
  const said = usePace(hobby);
  const [open, setOpen] = useState(initiallyOpen);

  // Which question is being asked again, after you pressed Change. Otherwise the step is whatever
  // has not been said yet, so a remembered pace and style go straight to the answer.
  const [asking, setAsking] = useState<'pace' | 'style' | null>(null);
  const [byDate, setByDate] = useState(false);
  const [by, setBy] = useState('');

  const [other, setOther] = useState(false);
  const [otherHours, setOtherHours] = useState('');
  const [otherPer, setOtherPer] = useState<Per>('day');
  const [otherError, setOtherError] = useState<string | null>(null);

  // Each answer takes the button that gave it off the screen, and focus with it — to the page
  // behind the drawer, where the next Tab walks the board. So whatever this component does to
  // itself, it says where the keyboard goes next: the question, or the link once it is hidden.
  const question = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const refocus = useRef(initiallyOpen);

  useEffect(() => {
    if (refocus.current) {
      refocus.current = false;
      (open ? question.current : opener.current)?.focus();
    }
  });

  const tiers = hltbTiers(estimates);
  const tier = tiers.find((one) => one.key === said.style) ?? null;
  const step = asking ?? (said.pace === null ? 'pace' : tier === null ? 'style' : 'answer');

  // Asked for both in this sitting, so the second is "2 of 2"; asked for the style alone — the
  // one you play to has no figure for this game — and there is no first to count.
  const [askedPace, setAskedPace] = useState(false);

  function show(next: boolean) {
    refocus.current = true;
    setOpen(next);
    if (!next) {
      setAsking(null);
    }
  }

  function choosePace(pace: Pace) {
    refocus.current = true;
    setPace(hobby, pace);
    setAskedPace(true);
    setAsking('style');
    setOther(false);
    setOtherError(null);
  }

  function chooseOther() {
    const parsed = parsePaceInput(otherHours, otherPer);
    if (parsed.error !== undefined) {
      setOtherError(parsed.error);
      return;
    }
    choosePace(parsed.value);
  }

  function chooseStyle(key: HltbTier['key']) {
    refocus.current = true;
    setPlayStyle(hobby, key);
    setAsking(null);
  }

  if (!open) {
    return (
      <button ref={opener} type="button" onClick={() => show(true)} className={`self-start ${LINK} font-medium`}>
        How long will it take me?
      </button>
    );
  }

  const label =
    step === 'pace'
      ? '1 of 2'
      : step === 'style' && askedPace
        ? '2 of 2'
        : 'How long will it take me?';

  return (
    <div
      ref={question}
      role="group"
      aria-label="How long will it take me?"
      tabIndex={-1}
      onChange={keepToItself}
      className="flex flex-col gap-2 rounded-lg border border-line p-3 outline-none"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">{label}</p>
        <button type="button" onClick={() => show(false)} className="text-xs text-muted hover:text-fg">
          Hide
        </button>
      </div>

      {step === 'pace' && (
        <>
          <p className="text-sm font-medium">How much do you play?</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((pace) => (
              <button
                key={formatPace(pace)}
                type="button"
                onClick={() => choosePace(pace)}
                className={PILL}
              >
                {formatPace(pace)}
              </button>
            ))}
            <button type="button" onClick={() => setOther(true)} className={PILL}>
              Other…
            </button>
          </div>

          {other && (
            <>
              <p className="text-xs leading-6 text-muted">
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  // Where the press on Other… was going, so it goes there.
                  autoFocus
                  aria-label="Hours you play"
                  value={otherHours}
                  onChange={(event) => setOtherHours(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter is Next here, and that is all it is.
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      chooseOther();
                    }
                  }}
                  className={`${INLINE_INPUT} w-14`}
                />{' '}
                h a{' '}
                <select
                  aria-label="A day or a week"
                  value={otherPer}
                  onChange={(event) => setOtherPer(event.target.value as Per)}
                  className={INLINE_INPUT}
                >
                  <option value="day">day</option>
                  <option value="week">week</option>
                </select>{' '}
                <button
                  type="button"
                  onClick={chooseOther}
                  className="ml-1 rounded border border-line px-2 py-0.5 text-xs text-fg hover:bg-hover"
                >
                  Next
                </button>
              </p>
              {otherError !== null && (
                <p role="alert" className="text-xs text-danger">
                  {otherError}
                </p>
              )}
            </>
          )}
        </>
      )}

      {step === 'style' && (
        <>
          <p className="text-sm font-medium">How will you play it?</p>
          <div className="flex flex-col gap-1">
            {STYLES.map((style) => {
              const figure = tiers.find((one) => one.key === style.key);
              if (figure === undefined) {
                return null;
              }

              // Named "Just the story Main story · 27 h" aloud. The two halves are flex items, so a
              // browser keeps them apart in the name with no space in the markup — measured, as
              // how-long.spec.ts clicks it by that name.
              return (
                <button
                  key={style.key}
                  type="button"
                  onClick={() => chooseStyle(style.key)}
                  className="flex items-baseline justify-between gap-3 rounded border border-line px-2.5 py-1.5 text-left text-sm hover:bg-hover"
                >
                  <span>{style.words}</span>
                  <span className="text-xs text-muted">
                    {figure.label} · {formatHours(figure.hours)}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {step === 'answer' && said.pace !== null && tier !== null && (
        <Answer
          tier={tier}
          played={played}
          pace={said.pace}
          byDate={byDate}
          by={by}
          onBy={setBy}
          onToggleByDate={() => setByDate((was) => !was)}
          onChange={() => {
            refocus.current = true;
            setAskedPace(false);
            setAsking('pace');
          }}
        />
      )}
    </div>
  );
}

interface AnswerProps {
  tier: HltbTier;
  played: number | null;
  pace: Pace;
  byDate: boolean;
  by: string;
  onBy: (day: string) => void;
  onToggleByDate: () => void;
  onChange: () => void;
}

/** The answer, and the two ways out of it: finish by a date instead, or change what you said. */
function Answer({ tier, played, pace, byDate, by, onBy, onToggleByDate, onChange }: AnswerProps) {
  const today = todayHere();
  const left = hoursLeft(tier.hours, played);
  const words = wordsFor(tier.key).toLowerCase();

  // Past it says so, in either mode. Nought days would read as finishing today, and nought hours
  // a day as a target already met by doing nothing.
  if (left === 0) {
    return (
      <>
        <p className="text-sm">
          <span className="font-semibold">You're past it.</span> {formatHours(played ?? 0)},
          against HowLongToBeat's {formatHours(tier.hours)} for {words}.
        </p>
        <Said pace={null} words={words} played={played} onChange={onChange} />
      </>
    );
  }

  const daysLeft = by === '' ? null : daysBetween(today, by);

  return (
    <>
      {byDate ? (
        <>
          <p className="text-sm leading-7">
            To finish by{' '}
            <input
              type="date"
              aria-label="Finish by"
              value={by}
              onChange={(event) => onBy(event.target.value)}
              className={INLINE_INPUT}
            />
            {daysLeft !== null && daysLeft > 0 && (
              <>
                , play about{' '}
                <span className="font-semibold whitespace-nowrap">
                  {formatNeeded(hoursNeeded(left, daysLeft, pace.per), pace.per)}
                </span>
                .
              </>
            )}
          </p>
          {daysLeft !== null && daysLeft <= 0 && (
            <p className="text-xs text-muted">Pick a date after today.</p>
          )}
        </>
      ) : (
        <FinishOn left={left} pace={pace} started={played !== null} today={today} />
      )}

      <Said pace={byDate ? null : pace} words={words} played={played} onChange={onChange} />

      <button type="button" onClick={onToggleByDate} className={`self-start ${LINK}`}>
        {byDate ? 'Use my pace instead' : 'Finish by a date instead'}
      </button>
    </>
  );
}

/** *7 more days — you'd finish around Oct 9.* "More" only once there are hours to be more than. */
function FinishOn({
  left,
  pace,
  started,
  today,
}: {
  left: number;
  pace: Pace;
  started: boolean;
  today: string;
}) {
  const days = daysToFinish(left, pace);

  return (
    <p className="text-sm">
      <span className="font-semibold whitespace-nowrap">
        {capitalise(describeSpan(days, started))}
      </span>{' '}
      — you'd finish around{' '}
      <span className="font-semibold whitespace-nowrap">
        {formatDayShort(addDays(today, days), today)}
      </span>
      .
    </p>
  );
}

/** What the answer was worked out from, and the way to say it differently. */
function Said({
  pace,
  words,
  played,
  onChange,
}: {
  pace: Pace | null;
  words: string;
  played: number | null;
  onChange: () => void;
}) {
  const parts = [
    ...(pace === null ? [] : [`at ${formatPace(pace)}`]),
    words,
    played === null ? 'from the start' : `from your ${formatHours(played)}`,
  ];

  return (
    <p className="text-xs text-muted">
      {capitalise(parts.join(', '))} ·{' '}
      <button type="button" onClick={onChange} className={LINK}>
        Change
      </button>
    </p>
  );
}
