import { getMovie, searchMovies, setMovieGenre } from '../api/movies';
import { formatMinutes, formatRuntime } from '../lib/hours';
import type { HobbyDefinition } from './types';

/**
 * Films: TMDB, and the words a film wants where a game wanted different ones.
 *
 * The wire vocabulary is untouched — `InProgress` is still `InProgress`, because cross-hobby
 * views depend on the four statuses being identical everywhere. Only what a person reads moves.
 */
export const MOVIES: HobbyDefinition = {
  slug: 'movies',

  columnLabel: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },

  lengthLabel: 'Runtime',

  // No tilde, and that is the difference worth keeping. A game's figure is an estimate of how
  // long it takes anyone; a film's runtime is exactly how long it is, and marking it as
  // approximate would be claiming less than is known.
  formatLength: (hours) => formatRuntime(hours),
  describeLength: (hours) => `${formatRuntime(hours)} long`,

  countPasses: (count) => `${count} viewings`,

  describeRemoval: (title, entryCount) =>
    entryCount > 1
      ? `Takes ${title} off your board — all ${entryCount} viewings, and their notes.`
      : `Takes ${title} off your board.`,

  /**
   * Ten of TMDB's nineteen, ordered specific before generic on the games list's rule.
   *
   * Documentary and Animation lead because they name the *form* rather than the subject, which
   * is the argument that puts Visual Novel above RPG: a documentary is a documentary however
   * else it is tagged. Drama is last because TMDB puts it on about half of everything, so it
   * says the least about what an evening is like.
   *
   * Nine are left out. Family, History, Music, Mystery, TV Movie, War and Western are either
   * rare enough on one person's board to spend a hue on or say little about the evening;
   * Adventure overlaps Action almost entirely in TMDB's tagging. **Fantasy is the one worth
   * adding first** if ten proves too few — it is a genuinely different evening from Science
   * Fiction, and it was held back only because eleven hues is already past what colour alone
   * can carry, which is why the card prints the name too.
   *
   * **Every stripe is null until the palette is workshopped.** The names resolve, the automatic
   * pick works and the drawer's genre select is populated; the stripe renders the transparent
   * placeholder an ungenred title already gets. `docs/design.md` asks that a hue be measured in
   * OKLab against its neighbours before it is added, and ten of them at once is not a thing to
   * do by eye in a code editor.
   */
  genres: [
    { name: 'Documentary', stripe: null },
    { name: 'Animation', stripe: null },
    { name: 'Horror', stripe: null },
    { name: 'Science Fiction', stripe: null },
    { name: 'Thriller', stripe: null },
    { name: 'Crime', stripe: null },
    { name: 'Romance', stripe: null },
    { name: 'Comedy', stripe: null },
    { name: 'Action', stripe: null },
    { name: 'Drama', stripe: null },
  ],

  search: {
    label: 'Search movies',
    placeholder: 'Search to add a film — Arrival, Parasite, Portrait of a Lady on Fire…',
    run: async (term) =>
      (await searchMovies(term)).map((movie) => ({
        id: movie.id,
        title: movie.title,
        coverUrl: movie.coverUrl,
        // The year and the director, where a game shows platforms and developers. Neither is on
        // TMDB's search response by accident: the year is, the director is not — which is why
        // the second line is empty until the film is added and enrichment fills it in.
        byline: [
          movie.releaseYear === null ? '' : String(movie.releaseYear),
          movie.directors.join(', '),
        ],
      })),
  },

  journal: {
    load: async (mediaId) => {
      const movie = await getMovie(mediaId);

      return {
        title: movie.title,
        byline: movie.directors,
        genres: movie.genres,
        primaryGenre: movie.primaryGenre,
        logEntries: movie.logEntries,
        // A film is watched, not played on something. The pass form reads `fields` rather than
        // this, so an empty list here is not what takes the platform select away — but a hobby
        // with no platforms and a control offering them would be the same bug twice.
        platforms: [],
        // Minutes rather than the board row's hours: this is read straight off TMDB, so there
        // is no round trip to undo. Absent, not "unknown", for a film TMDB has no runtime for —
        // and for one that has only ever been searched for, since search does not carry it.
        facts:
          movie.runtimeMinutes === null
            ? []
            : [{ label: 'Runtime', value: formatMinutes(movie.runtimeMinutes) }],
        // Nothing HowLongToBeat has an opinion about, which is what takes the pin off this
        // drawer and the four estimate tiers off its pass.
        hltb: null,
      };
    },

    setGenre: setMovieGenre,
    setHltbId: null,

    // The two the user asked for by name. A film's pass is a rating and two dates.
    fields: { hoursPlayed: false, platform: false },
  },
};
