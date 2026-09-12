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
   * **The hues were workshopped, not chosen here.** Three whole palettes were rendered as real
   * 4px stripes on a real board in all eight themes, with every pair's OKLab separation printed,
   * and the user picked *Meaning first*: each hue is what the genre feels like, and the two most
   * generic words are the quiet, near-neutral ones. The values and the floor are in `index.css`;
   * `palette.test.ts` re-measures every pair, so a hue added by eye later fails rather than
   * merely looking wrong.
   */
  genres: [
    { name: 'Documentary', stripe: 'bg-genre-documentary' },
    { name: 'Animation', stripe: 'bg-genre-animation' },
    { name: 'Horror', stripe: 'bg-genre-horror' },
    { name: 'Science Fiction', stripe: 'bg-genre-science-fiction' },
    { name: 'Thriller', stripe: 'bg-genre-thriller' },
    { name: 'Crime', stripe: 'bg-genre-crime' },
    { name: 'Romance', stripe: 'bg-genre-romance' },
    { name: 'Comedy', stripe: 'bg-genre-comedy' },
    { name: 'Action', stripe: 'bg-genre-action' },
    { name: 'Drama', stripe: 'bg-genre-drama' },
  ],

  search: {
    label: 'Search movies',
    placeholder: 'Search to add a film — The Odyssey, Fight Club, Guardians of the Galaxy…',
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
        // No release window: TMDB is not asked for one, so this hobby has no calendar for a
        // tile to offer. See HobbyDefinition.releases.
        release: null,
      })),
  },

  journal: {
    load: async (mediaId) => {
      const movie = await getMovie(mediaId);

      return {
        title: movie.title,
        // One name, so no second line. Stated rather than inferred, for the reason `seasons`
        // is: a hobby with two names that left this out would look exactly like this one.
        subtitle: null,
        byline: movie.directors,
        genres: movie.genres,
        primaryGenre: movie.primaryGenre,
        logEntries: movie.logEntries,
        // A film is watched, not played on something. The pass form reads `fields` rather than
        // this, so an empty list here is not what takes the platform select away — but a hobby
        // with no platforms and a control offering them would be the same bug twice.
        platforms: [],
        // Nor seasons. Two empty lists rather than one shape with two nullable halves, so a
        // hobby that gains one idea and not the other says so.
        seasons: [],
        episodeCount: null,
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
    fields: { hoursPlayed: false, platform: false, progress: false },
  },

  // A film is watched or it is not. Being partway through one is a Tuesday rather than a state
  // worth recording, which is exactly what separates it from a show.
  progress: null,

  // No release calendar: this hobby's provider is not asked for a release window, so
  // nothing ever fills the columns the board would partition Backlog on. Turning it on is this
  // block plus that provider work, in one commit — see HobbyDefinition.releases.
  releases: null,
};
