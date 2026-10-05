import type { ReactNode } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { stats as statsFor, statsYears } from '../api/stats';
import type { Stats } from '../api/types';
import { AppHeader } from '../shell/AppHeader';
import { YearPicker } from '../board/YearPicker';
import { statsKey, statsYearsKey } from '../board/keys';
import { columnHoursLines } from '../board/columnHours';
import { hobbyDefinition, type HobbyDefinition } from '../hobbies';
import { ratingTone } from '../lib/rating';
import type { Voice, Voiced } from '../lib/voice';
import { DEFAULT_HOBBY, boardPath, isReadyHobby, statsPath, type Hobby } from '../shell/hobbies';
import { againstEstimate, averageRating, completionPercent } from './stats';
import { AgainstChart } from './AgainstChart';
import { BacklogList } from './BacklogList';
import { FinishedCovers } from './FinishedCovers';
import { RatingSpread } from './RatingSpread';
import { Figure, Nothing, Panel, Tile, Under } from './Section';

/**
 * The page's words that address the board's owner, each beside what a share says in its place.
 * A share addresses nobody: the person reading it did not start, log or rate any of it. The #9
 * workshop's table, in `docs/plans/games-board-next.md`.
 */
const WORDS = {
  back: { own: 'Back to your board', shared: 'Back to the board' },
  started: {
    own: (titles: string, during: string) => `of the ${titles} you started${during}`,
    shared: (titles: string, during: string) => `of the ${titles} started${during}`,
  },
  withHours: {
    own: (titles: string) => `over ${titles} you logged hours for`,
    shared: (titles: string) => `over ${titles} with hours logged`,
  },
  againstPanel: {
    own: (against: string) => `You and ${against}`,
    shared: (against: string) => `Hours against ${against}`,
  },
  nothingToCompare: {
    own: 'Nothing to compare yet: log your hours on a game you finish.',
    shared: 'Nothing to compare yet.',
  },
} satisfies Record<string, Voiced<unknown>>;

/** A year as the address gives it: a year, every year, none named, or something that is neither. */
export type Asked = number | 'all' | undefined | 'neither';

export function askedFor(segment: string | undefined): Asked {
  if (segment === undefined) {
    return undefined;
  }

  if (segment === 'all') {
    return 'all';
  }

  return /^\d{4}$/.test(segment) ? Number(segment) : 'neither';
}

/**
 * The Stats page: what a year of a hobby added up to, every playthrough counted.
 *
 * A page of its own under the board's address, as Discover is, with the year in the address too —
 * `/board/games/stats/2026`, or `/all` for every year — so a year's stats are somewhere to come
 * back to. The layout was picked from rendered comparisons on 2 October 2026: four tiles of
 * headline numbers, then panels of detail two across in the board's wells.
 *
 * It names no hobby. A hobby without a `stats` block has no page, and its address goes to its
 * board — Discover's rule.
 */
export function StatsPage() {
  const { hobby, year } = useParams();

  // Every redirect before any hook: the board's rule for a slug nobody has built.
  if (!isReadyHobby(hobby)) {
    return <Navigate to={boardPath(DEFAULT_HOBBY)} replace />;
  }

  const definition = hobbyDefinition(hobby);

  if (definition.stats === null) {
    return <Navigate to={boardPath(hobby)} replace />;
  }

  const asked = askedFor(year);

  // Replaced rather than pushed, so Back never returns to an address whose only job is to leave.
  if (asked === 'neither') {
    return <Navigate to={statsPath(hobby)} replace />;
  }

  return <StatsOf hobby={hobby} asked={asked} definition={definition} />;
}

interface StatsOfProps {
  hobby: Hobby;
  asked: number | 'all' | undefined;
  definition: HobbyDefinition;
}

function StatsOf({ hobby, asked, definition }: StatsOfProps) {
  const navigate = useNavigate();

  const years = useQuery({
    queryKey: statsYearsKey(hobby),
    queryFn: () => statsYears(hobby),
  });

  const year = asked === 'all' ? undefined : asked;

  // No year named: the latest there is, as the board opens — and every year when nothing has one
  // yet. Nothing is asked for until the years say which, or the whole history would be fetched
  // and painted for a moment on the way to the year it was always going to be. No year control in
  // the meantime either, for the board's reason: it would say All years about a page that is
  // about to open on this one.
  if (asked === undefined) {
    if (years.data === undefined) {
      return (
        <Frame hobby={hobby} picker={null}>
          {years.error === null ? <Loading /> : <Failed error={years.error} />}
        </Frame>
      );
    }

    return <Navigate to={statsPath(hobby, years.data[0] ?? 'all')} replace />;
  }

  return (
    <Frame
      hobby={hobby}
      picker={
        // The board's own control, so a year it keeps on offer when the list has not got it — an
        // address naming a year before the list arrives, or one with nothing in it — is kept here
        // too, rather than the control going blank.
        <YearPicker
          years={years.data ?? []}
          value={year}
          onChange={(picked) =>
            void navigate(statsPath(hobby, picked ?? 'all'), { replace: true })
          }
        />
      }
    >
      <Year hobby={hobby} year={year} definition={definition} />
    </Frame>
  );
}

interface FrameProps {
  hobby: Hobby;
  /** The year control, or null while there is no year to say. */
  picker: ReactNode;
  children: ReactNode;
}

/** The page around the numbers: the app's header, the heading, the way back and the year. */
function Frame({ hobby, picker, children }: FrameProps) {
  return (
    // The board's gutter at every width, as Discover takes it, so the header does not step.
    <main className="min-h-screen bg-sunken p-4 text-fg md:p-6 2xl:p-8 3xl:p-10">
      <div className="mx-auto max-w-board">
        <AppHeader title="HobbyTracker" hobby={hobby} />

        <StatsHeading back={boardPath(hobby)} voice="own" />

        {picker !== null && <div className="mb-4">{picker}</div>}

        {children}
      </div>
    </main>
  );
}

/** The page's own heading, and the way back to the board it is the Stats page of. */
export function StatsHeading({ back, voice }: { back: string; voice: Voice }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 className="text-lg font-semibold">Stats</h2>
      <Link to={back} className="text-sm text-muted hover:text-fg">
        <span aria-hidden="true">← </span>
        {WORDS.back[voice]}
      </Link>
    </div>
  );
}

export function Loading() {
  return <p className="text-sm text-muted">Loading…</p>;
}

export function Failed({ error }: { error: Error }) {
  return (
    <p role="alert" className="text-sm text-danger">
      {error.message}
    </p>
  );
}

function Year({ hobby, year, definition }: { hobby: Hobby; year: number | undefined; definition: HobbyDefinition }) {
  const { data, error } = useQuery({
    queryKey: statsKey(hobby, year),
    queryFn: () => statsFor(hobby, year),
  });

  if (error !== null) {
    return <Failed error={error} />;
  }

  return data === undefined ? (
    <Loading />
  ) : (
    <Dashboard stats={data} year={year} definition={definition} voice="own" />
  );
}

interface DashboardProps {
  stats: Stats;
  year: number | undefined;
  definition: HobbyDefinition;
  /** Who the numbers are said to: the board's owner, or — on a share — nobody. */
  voice: Voice;
}

/**
 * The numbers themselves, from a year's stats: the tiles, then the panels. Shared with a share's
 * Stats page, which is this page whole, in its own voice.
 */
export function Dashboard({ stats, year, definition, voice }: DashboardProps) {
  const words = definition.stats!;
  const noun = words.noun;
  const { finished, hours, completion, backlog } = stats;

  // "in 2026", or nothing under All years: what every count on the page is about.
  const during = year === undefined ? '' : ` in ${year}`;

  // The comparison is the column header's: it needs the pass to record hours at all, and the
  // header's words, so a hobby with neither never compares — the data's say, not the slug's.
  const compares = definition.journal.fields.hoursPlayed && definition.columnHours !== null;

  const share = completionPercent(completion);
  const started = completion.finished + completion.going + completion.dropped;
  const average = averageRating(finished);
  const rated = finished.filter((finish) => finish.rating !== null).length;

  return (
    <div className="space-y-4">
      {/* The headline numbers once, across the top; the panels under them carry the detail. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile label="Finished">
          <Figure value={String(finished.length)} />
          <Under>
            {year === undefined ? `${noun(finished.length)}, all years` : `${noun(finished.length)}${during}`}
          </Under>
        </Tile>

        <Tile label="Completion">
          <Figure value={share === null ? null : `${share}%`} />
          {share === null ? (
            <Under>{`Nothing started${during === '' ? ' yet' : during}`}</Under>
          ) : (
            <>
              <CompletionBar {...completion} />
              <Under>{WORDS.started[voice](`${started} ${noun(started)}`, during)}</Under>
            </>
          )}
        </Tile>

        {compares && (
          <Tile label={`Vs ${words.against}`}>
            {hours.played === null || hours.playedLength === null ? (
              <>
                <Figure value={null} />
                <Under>Nothing to compare yet</Under>
              </>
            ) : (
              <>
                <Figure value={againstEstimate(hours.played, hours.playedLength).words} />
                <Under>
                  {WORDS.withHours[voice](`${hours.playedTitles} ${noun(hours.playedTitles)}`)}
                </Under>
              </>
            )}
          </Tile>
        )}

        <Tile label="Rating">
          <Figure
            value={average === null ? null : average.toFixed(1)}
            tone={average === null ? '' : ratingTone(average)}
          />
          <Under>{average === null ? 'Nothing rated yet' : `on average, over ${rated} rated`}</Under>
        </Tile>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Panel label={year === undefined ? 'Finished each year' : 'Finished each month'}>
          <FinishedCovers finished={finished} year={year} />
        </Panel>

        <Panel label="Ratings">
          <RatingSpread finished={finished} year={year} voice={voice} />
        </Panel>

        {compares && (
          <Panel label={WORDS.againstPanel[voice](words.against)}>
            <Compared stats={stats} definition={definition} voice={voice} />
          </Panel>
        )}

        <Panel label="Backlog">
          <BacklogList backlog={backlog} noun={noun} voice={voice} />
        </Panel>
      </div>
    </div>
  );
}

/**
 * Finished, still going and dropped, as one bar and a legend that says each in words. Finished
 * is the accent, still going a lighter step of it — on its way there — and dropped stands apart.
 * The bar is for the eye; the legend is the whole of it for a screen reader.
 */
function CompletionBar({ finished, going, dropped }: Stats['completion']) {
  const parts = [
    { count: finished, words: `${finished} finished`, fill: 'bg-accent' },
    { count: going, words: `${going} still going`, fill: 'bg-accent/30' },
    { count: dropped, words: `${dropped} dropped`, fill: 'bg-dropped' },
  ];
  const drawn = parts.filter((part) => part.count > 0);

  return (
    <>
      <div aria-hidden="true" className="mt-3 flex h-2.5 gap-0.5">
        {drawn.map((part, index) => (
          <span
            key={part.words}
            className={`${part.fill} ${index === 0 ? 'rounded-l-full' : ''} ${
              index === drawn.length - 1 ? 'rounded-r-full' : ''
            }`}
            style={{ flex: part.count }}
          />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {parts.map((part) => (
          <li key={part.words} className="flex items-center gap-1.5">
            <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-sm ${part.fill}`} />
            {part.words}
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * Your hours against the estimates, in the words Completed's header uses for the same thing —
 * the same function draws both, so the two can never read differently — and then each game.
 */
function Compared({
  stats,
  definition,
  voice,
}: {
  stats: Stats;
  definition: HobbyDefinition;
  voice: Voice;
}) {
  const { finished, hours } = stats;

  if (hours.played === null) {
    return <Nothing>{WORDS.nothingToCompare[voice]}</Nothing>;
  }

  const lines = columnHoursLines(definition, 'Completed', { total: finished.length, hours }, voice);

  return (
    <>
      <div className="mt-1 text-sm">
        {lines.map((line, index) => (
          <p
            key={line.text}
            role="img"
            aria-label={line.spoken}
            className={index === 0 ? 'tabular-nums' : 'text-muted'}
          >
            {line.text}
          </p>
        ))}
      </div>
      <AgainstChart finished={finished} />
    </>
  );
}
