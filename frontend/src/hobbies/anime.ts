import { getAnime, searchAnime, setAnimeGenre } from '../api/anime';
import { formatHours, formatMinutes } from '../lib/hours';
import type { HobbyDefinition, TitleFact } from './types';

/**
 * Anime: MyAnimeList, and the first hobby that is not television.
 *
 * It looks like the third file and is not. A show and an anime are both episodic, but MAL
 * models each **cour** as its own entry — `Sousou no Frieren` and `Sousou no Frieren 2nd
 * Season` are two ids and therefore two cards — where TMDB models a series as one title with
 * many seasons. That single fact is where every difference below comes from: the pass has an
 * episode and no season, the card carries a second title, and there is no season list anywhere.
 *
 * It also sits beside television deliberately rather than inside it. The decision was the
 * user's: *"Anime is a very specific genre that should be separated"* — the distinction is in
 * the titles, not the mechanics, and the mechanics being identical is not an argument for
 * merging them. `TmdbClient` keeps anime off the TV board to match.
 */
export const ANIME: HobbyDefinition = {
  slug: 'anime',

  // Watching and Watched, as films and shows are. A fourth word for the same act would read as
  // a distinction where there is none — and the nav puts all three side by side.
  columnLabel: {
    Backlog: 'Backlog',
    InProgress: 'Watching',
    Completed: 'Watched',
    Dropped: 'Dropped',
  },

  // Television's word, for television's reason: this board has two durations — the whole cour,
  // which is what a card's badge and `sort=length` mean, and one episode, which is what the
  // drawer's facts band means. Calling both Runtime would put two controls a few inches apart
  // naming numbers a factor of twenty-eight apart.
  lengthLabel: 'Time to watch',

  // The tilde, as television has it. MAL states an *average* episode duration and Postgres
  // multiplies it, so this is an estimate in exactly the way a film's exact runtime is not.
  formatLength: (hours) => `~${formatHours(hours)}`,
  describeLength: (hours) => `About ${hours} hours to watch`,

  countPasses: (count) => `${count} watches`,

  describeRemoval: (title, entryCount) =>
    entryCount > 1
      ? `Takes ${title} off your board — all ${entryCount} watches, and their notes.`
      : `Takes ${title} off your board.`,

  /**
   * MAL's vocabulary, which is three taxonomies in one array.
   *
   * **This is the good news of the provider.** MAL flattens genres, themes and demographics
   * into a single `genres` list — Frieren comes back as Adventure, Award Winning, Drama,
   * Fantasy, Shounen — so the ordered specific-before-generic rule this codebase already uses
   * works on it directly, with no merging step. The four themes at the top are the ones that
   * describe an evening rather than a subject, which is Visual Novel's placement argument
   * applied to a catalogue that has far more of them.
   *
   * Thirteen, where games has eleven and the two TMDB lists have ten. Anime genuinely carries
   * more axes that mean different evenings: Isekai and Mecha and Iyashikei have no counterpart
   * on any other board, and cutting to ten would have to lose one of Sci-Fi or Fantasy, which
   * between them cover most of the catalogue.
   *
   * **Demographics are deliberately unpainted.** Shounen, Seinen, Shoujo and Josei say who a
   * thing was published for rather than what watching it is like, and a title carrying nothing
   * else then paints as nothing — which is honest.
   *
   * **Six hues are the films palette's**, on television's shared-vocabulary argument exactly: a
   * horror is the same evening on either board, and a year-in-review page is the one screen
   * that will put two hobbies together. Only the seven words anime owns outright are minted.
   * The floor is Mecha against Isekai at 0.103; every other pair clears 0.107.
   */
  genres: [
    { name: 'Isekai', stripe: 'bg-genre-isekai' },
    { name: 'Iyashikei', stripe: 'bg-genre-iyashikei' },
    { name: 'Mecha', stripe: 'bg-genre-mecha' },
    { name: 'Psychological', stripe: 'bg-genre-psychological' },
    { name: 'Sports', stripe: 'bg-genre-sports' },
    { name: 'Slice of Life', stripe: 'bg-genre-slice-of-life' },
    { name: 'Horror', stripe: 'bg-genre-horror' },
    { name: 'Romance', stripe: 'bg-genre-romance' },
    { name: 'Comedy', stripe: 'bg-genre-comedy' },
    { name: 'Sci-Fi', stripe: 'bg-genre-science-fiction' },
    { name: 'Fantasy', stripe: 'bg-genre-fantasy' },
    { name: 'Action', stripe: 'bg-genre-action' },
    { name: 'Drama', stripe: 'bg-genre-drama' },
  ],

  search: {
    label: 'Search anime',
    placeholder: 'Search to add an anime — Frieren, Cowboy Bebop, Mushishi…',
    run: async (term) =>
      (await searchAnime(term)).map((anime) => {
        const [leading, other] = titleLines(anime);

        return {
          id: anime.id,
          title: leading,
          coverUrl: anime.coverUrl,
          // **Both lines are filled from the search itself**, unlike every other hobby here:
          // MAL answers the same node to a search and to a detail call, so nothing is waiting
          // on the title being added. The romaji name is under the English one, in the order
          // the card will show them, and the cour says which of several entries this is.
          byline: [other ?? '', seasonAndYear(anime.startSeason, anime.startYear) ?? ''],
          // No release window: MAL is not asked for one, so this hobby has no calendar for a
          // tile to offer. See HobbyDefinition.releases.
          release: null,
        };
      }),
  },

  journal: {
    load: async (mediaId) => {
      const anime = await getAnime(mediaId);
      const [leading, other] = titleLines(anime);

      return {
        // The card's order, and the drawer opens off the card: a heading that disagreed with
        // the thing just clicked would read as the wrong title having been opened.
        title: leading,
        subtitle: other,
        // The studio, which is what anybody names when they say who made an anime — a game's
        // developers and a film's directors answer the same question.
        byline: anime.studios,
        genres: anime.genres,
        primaryGenre: anime.primaryGenre,
        logEntries: anime.logEntries,
        platforms: [],
        // Empty, and that emptiness is the decision rather than an omission: a cour is its own
        // MAL entry, so there is no season to choose between.
        seasons: [],
        // What the one episode dropdown is sized from instead. Null for a cour that has not
        // aired — MAL answers nought there and nought means unknown, so the control offers
        // nothing rather than offering episode 0.
        episodeCount: anime.episodeCount,
        facts: animeFacts(anime),
        // MAL answers by id and the id came from MAL's own search, so there is no matcher to
        // have got it wrong — the film's argument, and what takes the pin off this drawer.
        hltb: null,
      };
    },

    setGenre: setAnimeGenre,
    setHltbId: null,

    // The episode alone, which is what makes this hobby's form different from every other one.
    // `ck_log_entries_episode_needs_season` forbade exactly this shape and was dropped for it.
    fields: { hoursPlayed: false, platform: false, progress: 'episode' },
  },

  progress: {
    // `E12`, and no season half to be missing. Television's `format` returns null for an
    // episode with no season, commenting that it would be inventing the half that is missing —
    // that comment is correct for television and this is why it is not a shared function.
    format: (_season, episode) => (episode === null ? null : `E${episode}`),

    describe: (_season, episode) =>
      episode === null ? 'Not started' : `Episode ${episode}`,
  },

  // No release calendar: this hobby's provider is not asked for a release window, so
  // nothing ever fills the columns the board would partition Backlog on. Turning it on is this
  // block plus that provider work, in one commit — see HobbyDefinition.releases.
  releases: null,
};

/**
 * A cour's two names, in the order they are read: the English one, then the romaji one.
 *
 * **The English name leads**, because it is what a person here calls the thing. `media.title`
 * still holds the romaji — that is MAL's own `title` and what its search matches on — so this
 * is a reading order rather than a second place a title is stored. The board row arrives with
 * the choice already made by the server, in `LibraryItemDto`; this is the same rule for the two
 * places that read a catalogue response directly, the search tile and the drawer.
 *
 * **The second name is dropped when it is the first one again.** Found by the e2e suite rather
 * than reasoned about, and not a stub artefact: MAL genuinely answers `alternative_titles.en`
 * of "Cowboy Bebop" for *Cowboy Bebop*, and does the same for every title whose romaji reading
 * is already English. Rendered blindly, those print their own name twice.
 *
 * Compared case-insensitively and with the ends trimmed, because "the same name" is a thing a
 * reader judges rather than a byte comparison — and **never any looser than that**, since
 * `Frieren` and `Frieren: Beyond Journey's End` are genuinely two names. `Card.tsx` states the
 * same rule over the row's own pair, which is the platform's copy of it rather than a duplicate
 * of this one: the card has to hold for a hobby that has not been written yet.
 */
function titleLines(anime: {
  title: string;
  englishTitle: string | null;
}): [leading: string, other: string | null] {
  const leading = anime.englishTitle ?? anime.title;
  const same = leading.trim().toLowerCase() === anime.title.trim().toLowerCase();

  return [leading, same ? null : anime.title];
}

/**
 * `Fall 2023`, which is how anybody says when a cour aired.
 *
 * Both halves or neither: a season with no year says nothing about *which* autumn, and a year
 * on its own is already the less interesting half. MAL's own word, capitalised — it sends
 * `fall` and nobody writes it that way.
 */
function seasonAndYear(season: string | null, year: number | null): string | null {
  if (year === null) {
    return null;
  }

  return season === null ? String(year) : `${capitalise(season)} ${year}`;
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * The four facts about a cour, each dropped entirely when MAL has nothing to say.
 *
 * The films runtime rule: a dash there would read as a fact about the title rather than about
 * the request. Unlike a show, none of these arrives late — MAL answers everything to a search —
 * so a missing one is genuinely missing rather than not yet fetched.
 */
function animeFacts(anime: {
  externalId: string | null;
  mediaType: string | null;
  episodeCount: number | null;
  episodeRuntimeSeconds: number | null;
  airStatus: string | null;
  startSeason: string | null;
  startYear: number | null;
  sourceMaterial: string | null;
  meanScore: number | null;
}): TitleFact[] {
  const facts: TitleFact[] = [];

  const run = [
    anime.mediaType === null ? null : mediaTypeName(anime.mediaType),
    anime.episodeCount === null
      ? null
      : `${anime.episodeCount} episode${anime.episodeCount === 1 ? '' : 's'}`,
  ].filter((part) => part !== null);

  if (run.length > 0) {
    facts.push({ label: 'Run', value: run.join(' · ') });
  }

  // `Airing` and not `Status`, one word away from where *you* are on the title — the same
  // collision `air_status` avoids in the schema, and this is the reader-facing half of it.
  const airing = [
    anime.airStatus === null ? null : airStatusName(anime.airStatus),
    seasonAndYear(anime.startSeason, anime.startYear),
  ].filter((part) => part !== null);

  if (airing.length > 0) {
    facts.push({ label: 'Airing', value: airing.join(' · ') });
  }

  if (anime.episodeRuntimeSeconds !== null) {
    // One episode, in the same words a film's runtime is written in. The seconds are MAL's own
    // unit and are divided here rather than stored differently — the column keeps what the
    // provider said, and a display is the only place that has to pick a unit for a reader.
    facts.push({
      label: 'Episode',
      value: formatMinutes(Math.round(anime.episodeRuntimeSeconds / 60)),
    });
  }

  // MAL's own score, and the reason it is worth a line: it is out of ten, which is the scale a
  // pass's rating uses, so the two sit beside each other with no footnote.
  //
  // It was labelled `MAL` while that was the only thing here MAL's name could mean. It is not
  // any more — the link below wants the word more than the number does, because a label reading
  // `MAL` beside `View on MyAnimeList` is the one that explains itself. What says whose
  // opinion the score is, is that it sits in the band of things the provider states rather than
  // in the form below, where you record your own.
  if (anime.meanScore !== null) {
    facts.push({ label: 'Rating', value: anime.meanScore.toFixed(2) });
  }

  if (anime.sourceMaterial !== null) {
    // Whether a thing is an original or an adaptation is most of what anybody wants to know
    // before starting it.
    facts.push({ label: 'Source', value: sourceMaterialName(anime.sourceMaterial) });
  }

  // The way back to the entry this card was built from — last, because it is the only row here
  // that leaves the app, and everything above it is something to read rather than to press.
  //
  // **Not `source_lu.base_url`**, which is `https://api.myanimelist.net/v2/` — the API rather
  // than the site, and the two are not the same host. Written out here for the same reason
  // `HltbPin` writes howlongtobeat.com out: it is a fact about where a person goes, which is
  // the client's business, and threading it through the DTO would put a reader-facing URL in a
  // column that holds a machine-facing one.
  //
  // Dropped where there is no id to build it from. `external_id` is nullable because `media`'s
  // is, and an anime is only ever written by a MAL search — so this is a shape the app cannot
  // currently reach rather than one it reaches often. A link to `/anime/null` is worse than no
  // link, and this is the one fact here that is not MAL's opinion about the title: a cour MAL
  // knows nothing else about is exactly the one worth being able to open.
  if (anime.externalId !== null) {
    facts.push({
      label: 'MAL',
      value: 'View on MyAnimeList',
      href: `https://myanimelist.net/anime/${anime.externalId}`,
    });
  }

  return facts;
}

/**
 * MAL's `media_type`, in the words people use.
 *
 * `TV` and `OVA` and `ONA` are initialisms and stay upper-case; the rest are ordinary words.
 * Anything MAL adds later falls through as itself rather than as a blank — the value is theirs
 * to change, which is why the column is free text.
 */
function mediaTypeName(mediaType: string): string {
  const known: Record<string, string> = {
    tv: 'TV',
    tv_special: 'TV special',
    movie: 'Movie',
    ova: 'OVA',
    ona: 'ONA',
    special: 'Special',
    music: 'Music',
    cm: 'Commercial',
    pv: 'Promo',
  };

  return known[mediaType] ?? mediaType;
}

/** MAL's `status`, which is snake_case on the wire and a sentence to a reader. */
function airStatusName(status: string): string {
  const known: Record<string, string> = {
    finished_airing: 'Finished',
    currently_airing: 'Airing',
    not_yet_aired: 'Not yet aired',
  };

  return known[status] ?? status;
}

/** MAL's `source`, likewise — seventeen values, all snake_case, all theirs to change. */
function sourceMaterialName(source: string): string {
  const known: Record<string, string> = {
    original: 'Original',
    manga: 'Manga',
    '4_koma_manga': '4-koma manga',
    web_manga: 'Web manga',
    digital_manga: 'Digital manga',
    novel: 'Novel',
    light_novel: 'Light novel',
    web_novel: 'Web novel',
    visual_novel: 'Visual novel',
    game: 'Game',
    card_game: 'Card game',
    book: 'Book',
    picture_book: 'Picture book',
    radio: 'Radio',
    music: 'Music',
    mixed_media: 'Mixed media',
    other: 'Other',
  };

  return known[source] ?? source;
}
