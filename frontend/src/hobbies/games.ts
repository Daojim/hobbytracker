import { getGame, searchGames, setGameGenre, setGameHltbId } from '../api/games';
import { formatHours } from '../lib/hours';
import type { HobbyDefinition } from './types';

/**
 * Games: IGDB, HowLongToBeat, and the words the board has always used.
 *
 * Everything here was somewhere else before movies existed — the column labels in
 * `board/columns.ts` and again in `EntryDrawer`, the genre list in `board/genres.ts`, the length
 * badge inline in `Card.tsx`. Gathering them changed none of them.
 */
export const GAMES: HobbyDefinition = {
  slug: 'games',

  columnLabel: {
    Backlog: 'Backlog',
    InProgress: 'Playing',
    Completed: 'Completed',
    Dropped: 'Dropped',
  },

  // Named for what it answers rather than for the column behind it: "Hours" alone would read as
  // the hours you have put in, which is a different number and one the drawer also shows.
  lengthLabel: 'Time to beat',

  // The tilde is doing real work. The drawer prints "31.5 h" for what a pass took *you*, so an
  // unmarked number on a card would read as the same kind of claim about a game you have not
  // started.
  formatLength: (hours) => `~${formatHours(hours)}`,
  describeLength: (hours) => `About ${hours} hours to finish`,

  countPasses: (count) => `${count} playthroughs`,

  describeRemoval: (title, entryCount) =>
    entryCount > 1
      ? `Takes ${title} off your board — all ${entryCount} playthroughs, and their notes.`
      : `Takes ${title} off your board.`,

  /**
   * Ordered specific before generic. `Indie`, `Arcade` and most of the rest of IGDB's vocabulary
   * are absent on purpose: they say almost nothing about what an evening with the game is like,
   * and eleven hues is already more than anyone can tell apart at a glance — which is why the
   * card prints the genre's name as well as painting it.
   */
  genres: [
    // Above RPG, and that is the one placement here worth defending. Visual Novel is the most
    // specific thing IGDB says about a game — it names the form rather than the subject matter,
    // and a game that is one is an evening of reading however else it is tagged. RPG is one of
    // IGDB's broadest words: it covers Skyrim, Diablo and Disco Elysium alike. A game carrying
    // both is usually a visual novel with battles in it. One line to move if that reads wrong.
    { name: 'Visual Novel', stripe: 'bg-genre-visual-novel' },
    { name: 'Role-playing (RPG)', stripe: 'bg-genre-rpg' },
    { name: 'Shooter', stripe: 'bg-genre-shooter' },
    { name: 'Platform', stripe: 'bg-genre-platform' },
    { name: 'Fighting', stripe: 'bg-genre-fighting' },
    { name: "Hack and slash/Beat 'em up", stripe: 'bg-genre-brawler' },
    { name: 'Racing', stripe: 'bg-genre-racing' },
    { name: 'Strategy', stripe: 'bg-genre-strategy' },
    { name: 'Simulator', stripe: 'bg-genre-simulator' },
    { name: 'Puzzle', stripe: 'bg-genre-puzzle' },
    { name: 'Adventure', stripe: 'bg-genre-adventure' },
  ],

  search: {
    label: 'Search games',
    placeholder: 'Search to add a game — Hollow Knight, Celeste, Outer Wilds…',
    run: async (term) =>
      (await searchGames(term)).map((game) => ({
        id: game.id,
        title: game.title,
        coverUrl: game.coverUrl,
        byline: [game.platforms.join(', '), game.developers.join(', ')],
        // Passed through rather than re-decided here. `released` is the server's answer to the
        // same question the Backlog column is partitioned on, and deriving a second one on the
        // client is how a tile ends up offering the calendar for a title that lands in Backlog.
        release: {
          released: game.released,
          day: game.releaseDate,
          precision: game.releasePrecision,
        },
      })),
  },

  journal: {
    load: async (mediaId) => {
      const game = await getGame(mediaId);

      return {
        title: game.title,
        // One name, so no second line. Stated rather than inferred, for the reason `seasons`
        // is: a hobby with two names that left this out would look exactly like this one.
        subtitle: null,
        // The developer alone. The platforms were in this line while it was the game's only
        // byline, but they have a control of their own further down — a list of them under the
        // title was a spec sheet where a name belongs.
        byline: game.developers,
        genres: game.genres,
        primaryGenre: game.primaryGenre,
        logEntries: game.logEntries,
        platforms: game.platforms,
        // A game is one thing you finish, not a run you are partway through in a way anybody
        // numbers. `[]` rather than a null, on the same rule `platforms` follows for a film.
        seasons: [],
        episodeCount: null,
        // Nothing about a game is a fixed fact worth a line here: its length is HowLongToBeat's
        // guess and belongs beside your own hours, and its release year is on no card yet.
        facts: [],
        hltb: {
          id: game.hltbId,
          hltbAllStylesHours: game.hltbAllStylesHours,
          hltbMainStoryHours: game.hltbMainStoryHours,
          hltbMainExtraHours: game.hltbMainExtraHours,
          hltbCompletionistHours: game.hltbCompletionistHours,
        },
      };
    },

    setGenre: setGameGenre,
    setHltbId: setGameHltbId,

    fields: { hoursPlayed: true, platform: true, progress: false },
  },

  // Replays are passes, not positions. Being eleven hours into Hollow Knight is a number the
  // pass already carries, and it is not a place in a list of episodes.
  progress: null,

  // The one hobby with a release calendar, and only because IGDB is the only provider asked for
  // a release window. Films and shows have one too; nothing has gone and fetched it.
  releases: {
    heading: 'Coming soon',
    addAction: 'Add to calendar',
    describeAdd: (title) => `Add ${title} to your release calendar`,
    noDateHeading: 'No date yet',
    empty: 'Nothing on your board is waiting to come out.',
    newBadge: 'New',
  },
};
