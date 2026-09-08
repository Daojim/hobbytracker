import { getShow, searchShows, setShowGenre } from '../api/tv';
import { formatHours, formatMinutes } from '../lib/hours';
import type { HobbyDefinition, TitleFact } from './types';

/**
 * Television: TMDB again, and the first hobby whose titles you are *partway through*.
 *
 * The third file here, and the one that answers the question the second could not: films
 * borrowed almost every word from games, so `movies.ts` proved the seam existed without
 * stretching it. A show stretches it — it needs a control games and films have no counterpart
 * for, a length that is an estimate where a film's is exact, and a genre vocabulary that is
 * TMDB's *other* one.
 */
export const TV: HobbyDefinition = {
  slug: 'tv',

  // The film's four, unchanged. A show and a film are watched, and the two boards sitting side
  // by side in the nav would read oddly if one of them found a third word for it.
  columnLabel: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },

  /**
   * Not "Runtime", and that is a constraint rather than a preference.
   *
   * A film's board has one duration and a show's has two: the whole run, which is what a card's
   * badge and `sort=length` mean, and one episode, which is what the drawer's facts band means.
   * They differ by a factor of nineteen on a two-season show. Calling both Runtime would put two
   * controls a few inches apart naming wildly different numbers with the same word.
   */
  lengthLabel: 'Time to watch',

  // The tilde is back, where a film refused it. Episodes times an *average* episode length is an
  // estimate — the column is computed by Postgres from two figures TMDB rounds — so it is the
  // same kind of claim as HowLongToBeat's number and is marked the same way.
  formatLength: (hours) => `~${formatHours(hours)}`,
  describeLength: (hours) => `About ${hours} hours to watch`,

  // "Watches" rather than "viewings": a film is viewed and a series is watched, and a rewatch
  // of nineteen episodes is not a viewing of anything.
  countPasses: (count) => `${count} watches`,

  describeRemoval: (title, entryCount) =>
    entryCount > 1
      ? `Takes ${title} off your board — all ${entryCount} watches, and their notes.`
      : `Takes ${title} off your board.`,

  /**
   * TMDB's *other* genre list — the television one, which is not the film one.
   *
   * Sixteen exist and ten are named here, ordered specific before generic on the games list's
   * rule. Three of the words television owns outright have no film counterpart at all: TMDB's TV
   * vocabulary folds science fiction into fantasy and action into adventure, and has no Horror
   * and no Thriller. Read against the films list a show would come back unpainted for exactly
   * the words TV uses most, which is why the list is a property of the hobby.
   *
   * Six are left out. Kids, Family, News, Soap, Talk and Western are either rare on one person's
   * board or say little about the evening — News and Talk in particular are what a documentary
   * is not, and nobody logs them.
   *
   * **Seven hues are the films palette's, and that is deliberate.** A documentary is the same
   * evening on either board, and the year-in-review page is the one screen that will put two
   * hobbies together — a divergence there would be the thing you notice. Only Reality, Mystery
   * and War & Politics are new. The palette was workshopped as three whole options rendered on
   * a real board in all eight themes; this is *Shared vocabulary*, floor 0.1144, and the values
   * live in `index.css` where `palette.test.ts` re-measures every pair.
   *
   * The finding worth keeping from that workshop: the first pass of all three options failed on
   * the same pair. War & Politics reads naturally as olive, which puts a *third* near-neutral
   * between Documentary and Drama, and ten hues have room for two. TMDB's TV genres have no
   * Horror, so the deep-red corner was unclaimed — War & Politics took it, and every option then
   * cleared the floor.
   */
  genres: [
    { name: 'Documentary', stripe: 'bg-genre-documentary' },
    { name: 'Animation', stripe: 'bg-genre-animation' },
    { name: 'Reality', stripe: 'bg-genre-reality' },
    { name: 'Sci-Fi & Fantasy', stripe: 'bg-genre-science-fiction' },
    { name: 'Crime', stripe: 'bg-genre-crime' },
    { name: 'Mystery', stripe: 'bg-genre-mystery' },
    { name: 'War & Politics', stripe: 'bg-genre-war-politics' },
    { name: 'Comedy', stripe: 'bg-genre-comedy' },
    { name: 'Action & Adventure', stripe: 'bg-genre-action' },
    { name: 'Drama', stripe: 'bg-genre-drama' },
  ],

  search: {
    label: 'Search TV shows',
    placeholder: 'Search to add a show — Severance, The Bear, Breaking Bad…',
    run: async (term) =>
      (await searchShows(term)).map((show) => ({
        id: show.id,
        title: show.title,
        coverUrl: show.coverUrl,
        // The first air year and the creator, which is the film's year-and-director exactly —
        // including the half that is empty. TMDB's `/search/tv` carries `first_air_date` and no
        // `created_by`, so the second line fills in once the show is added and the detail call
        // answers. `SearchResult` drops an empty line rather than rendering a gap.
        byline: [
          show.firstAirYear === null ? '' : String(show.firstAirYear),
          show.creators.join(', '),
        ],
      })),
  },

  journal: {
    load: async (mediaId) => {
      const show = await getShow(mediaId);

      return {
        title: show.title,
        // One name, so no second line. Stated rather than inferred, for the reason `seasons`
        // is: a hobby with two names that left this out would look exactly like this one.
        subtitle: null,
        byline: show.creators,
        genres: show.genres,
        primaryGenre: show.primaryGenre,
        logEntries: show.logEntries,
        // Watched, not played on something — the film's answer, for the film's reason.
        platforms: [],
        /**
         * Named here rather than left to the form, because the form has to print something in
         * the option and the fallback is the hobby's business: TMDB leaves a season unnamed
         * often enough, and season 0 is Specials to everyone who watches it and 0 to nobody.
         */
        seasons: show.seasons.map((season) => ({
          number: season.seasonNumber,
          label: season.name ?? seasonName(season.seasonNumber),
          episodeCount: season.episodeCount,
        })),
        // Null, and not `numberOfEpisodes`. This is what a hobby with no seasons sizes its one
        // episode dropdown from; a show sizes its second from whichever season was chosen, and
        // putting the whole run's total here would offer episode 19 of a season with nine in it.
        episodeCount: null,
        facts: showFacts(show),
        // TMDB answers by id and the id came from TMDB's own search, so there is no matcher to
        // have got it wrong — the film's argument, and what takes the pin off this drawer.
        hltb: null,
      };
    },

    setGenre: setShowGenre,
    setHltbId: null,

    // The pair is the whole of what a show adds. Still no hours: nobody records how long an
    // evening of television took, and the facts band already says how long one episode runs.
    fields: { hoursPlayed: false, platform: false, progress: 'season-episode' },
  },

  progress: {
    format: (season, episode) => {
      if (season === null) {
        // An episode with no season is refused by the API and by the form, so `E7` alone would
        // be inventing the half that is missing rather than printing the half that is there.
        return null;
      }

      const where = season === 0 ? 'Specials' : `S${season}`;
      return episode === null ? where : `${where} E${episode}`;
    },

    describe: (season, episode) => {
      if (season === null) {
        return 'Not started';
      }

      const where = season === 0 ? 'Specials' : `Season ${season}`;
      return episode === null ? where : `${where}, episode ${episode}`;
    },
  },
};

/**
 * What season 0 is called, and what an unnamed one is called.
 *
 * `Specials` because that is TMDB's own name for it when it bothers to send one, and because the
 * badge on a card has to agree with the option in the dropdown — a card reading `S0 E3` would be
 * the one place in the app calling it something nobody says.
 */
const seasonName = (number: number) => (number === 0 ? 'Specials' : `Season ${number}`);

/**
 * The three facts about a show, each a pair that only reads as a fact together.
 *
 * Seasons say little without the episode count; a status says nothing about *when* without the
 * year span. Dropped entirely rather than printed with a dash, on the film runtime's rule: a
 * show only ever searched for has none of these, because TMDB's `/search/tv` carries none of
 * them, and a dash there would read as a fact about the show rather than about the request.
 */
function showFacts(show: {
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  airStatus: string | null;
  firstAirYear: number | null;
  lastAirYear: number | null;
  episodeRuntimeMinutes: number | null;
}): TitleFact[] {
  const facts: TitleFact[] = [];

  const run = [
    count(show.numberOfSeasons, 'season'),
    count(show.numberOfEpisodes, 'episode'),
  ].filter((part) => part !== null);

  if (run.length > 0) {
    facts.push({ label: 'Run', value: run.join(' · ') });
  }

  // `Airing` and not `Status`, one word away from where *you* are on the title. The column is
  // called `air_status` for the same collision, and this is the reader-facing half of it.
  const airing = [show.airStatus, yearSpan(show.firstAirYear, show.lastAirYear)].filter(
    (part) => part !== null,
  );

  if (airing.length > 0) {
    facts.push({ label: 'Airing', value: airing.join(' · ') });
  }

  if (show.episodeRuntimeMinutes !== null) {
    // One episode, in the same words a film's runtime is written in — and the reason the sort
    // control could not also call its number Runtime.
    facts.push({ label: 'Episode', value: formatMinutes(show.episodeRuntimeMinutes) });
  }

  return facts;
}

const count = (howMany: number | null, noun: string) =>
  howMany === null ? null : `${howMany} ${noun}${howMany === 1 ? '' : 's'}`;

/**
 * `2022–` while it is running, `2016–2019` once it is over, and `2016` for a run inside one year.
 *
 * The open end is the point: a null `lastAirYear` is what a show still on air has, so inventing
 * an end would be claiming it had finished. An en dash rather than a hyphen, because that is
 * what a span is written with.
 */
function yearSpan(first: number | null, last: number | null): string | null {
  if (first === null) {
    return last === null ? null : String(last);
  }

  if (last === null) {
    return `${first}–`;
  }

  return last === first ? String(first) : `${first}–${last}`;
}
