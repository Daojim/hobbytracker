using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One title in your collection.
///
/// "Collection" means logged, not cached. Searching IGDB writes every result into `media` as a
/// side effect, so that table is a metadata cache holding everything ever typed into a search
/// box. The library is the subset you actually recorded something about.
/// </summary>
public sealed record LibraryItemDto(
    int MediaId,
    string Title,

    /// <summary>
    /// A second line under the title on a card, for a hobby whose titles have two names.
    ///
    /// Anime is why it exists: MAL states a romaji title and, often but not always, an English
    /// one — <c>Sousou no Frieren</c> with <c>Frieren: Beyond Journey's End</c> under it. Both
    /// are worth finding by eye, and <c>media.title</c> holds the romaji so that search, the
    /// drawer's heading and the remove confirmation all need no special case.
    ///
    /// <b>Named for what it is on the row rather than for what anime means by it.</b> This is
    /// the platform's field and the next hobby to want one may not mean English by it: a book
    /// has a series, an album has an artist. <c>anime.english_title</c> is allowed to be
    /// specific because that column is the hobby's.
    ///
    /// Null for every other hobby and null for most anime, which are the same kind of null —
    /// the LEFT JOIN behind the TPT downcast answers it for free, and the card renders nothing
    /// rather than an empty line.
    /// </summary>
    string? Subtitle,

    string? CoverUrl,
    string Hobby,
    /// <summary>Status of the most recent entry — a replay in progress beats an old completion.</summary>
    LogStatus CurrentStatus,
    /// <summary>How many times this has been logged. Greater than one means replays.</summary>
    int EntryCount,
    decimal? LatestRating,
    /// <summary>When the latest entry finished, or when it started if it has not.</summary>
    DateTimeOffset? LastActivity,

    /// <summary>
    /// The title's genres, and which of them was chosen to stand for it — the card's colour.
    ///
    /// Not a games concept, despite living in a detail table: films have genres and books will.
    /// The vocabulary differs per hobby and so does the palette, but both are the client's to
    /// know — which genre wins when none was chosen is settled there, where the ordering and the
    /// colours are the same list.
    ///
    /// Null rather than empty for a row whose hobby has no detail table yet: this is reached
    /// through a TPT downcast, and the LEFT JOIN behind it answers null for a media row with
    /// nothing on the other side.
    /// </summary>
    IReadOnlyList<string>? Genres,
    string? PrimaryGenre,

    /// <summary>
    /// How long this title takes, in hours — the one number a card has room for.
    ///
    /// What that means is the hobby's business, not this row's. For a game it is the headline
    /// figure HowLongToBeat prints at the top of a game page — 41.82 for Hollow Knight — with
    /// its three tiers left to the drawer, where they can be named. For a film it is the runtime.
    ///
    /// <b>This is also what <c>sort=length</c> orders on, and the two have to stay one field.</b>
    /// A column ordered by a figure none of its cards show reads as broken, and the surest way to
    /// keep them together is to give them nothing to drift apart over.
    ///
    /// Hours rather than minutes because a game's estimate is stored in hours to two decimal
    /// places and this carries it through untouched; a film's runtime divides down exactly, and
    /// the client recovers the whole minute with <c>Math.round(hours * 60)</c> — two decimal
    /// places is at most 0.3 of a minute out, so that is lossless in both directions.
    ///
    /// Null for a row whose detail table has nothing to say, for the same reason as
    /// <see cref="Genres"/>; null for a game nothing has matched to HowLongToBeat; and null for
    /// one matched before the number was fetched at all — POST /api/games/hltb/refresh fills
    /// those in.
    /// </summary>
    decimal? LengthHours,

    /// <summary>
    /// Whether HowLongToBeat has yet to be asked about this title at all.
    ///
    /// It exists so the board can tell "no estimate, and one may still arrive" from "no estimate,
    /// and none is coming". Adding a title replies before the lookup has begun — nothing a person
    /// does waits on HowLongToBeat — so without this the card has no way to know an answer is on
    /// its way and sits blank until something unrelated happens to refetch it.
    ///
    /// Read off <c>hltb_checked_at</c> rather than off the hours, and that is the whole of what
    /// makes it safe to wait on: the column is stamped on a refusal exactly as it is on a match,
    /// so a title HowLongToBeat has never heard of stops being pending with nothing to show. The
    /// hours alone cannot say the difference, and a board waiting on them would wait for ever on
    /// every unmatchable title.
    ///
    /// False — not true — for a row that is not a game. The TPT downcast answers null for a media
    /// row with no games row behind it, and "there is no games row" is a different claim from
    /// "nobody has looked yet"; conflating them would set the movies board polling for ever.
    /// </summary>
    bool HltbPending,

    /// <summary>
    /// The opening of the most recent thing you wrote about this title, or null if you have
    /// written nothing. The whole of it lives in the drawer; this is a preview and is named so,
    /// because a field called <c>LatestNote</c> that is not the note would be a lie.
    ///
    /// Cut at <c>LibraryService.NotePreviewLength</c> characters. A note may be 4000, and
    /// a board is up to four columns of a hundred rows — uncapped, this field would make the
    /// board response scale with how much somebody writes. The cap is comfortably more than two
    /// lines can show at the widest card, so what a reader sees cut is always the client's
    /// line-clamp and never this.
    ///
    /// The most recent across *every* pass of yours, deliberately unlike everything else on the
    /// row. See the projection in <c>LibraryService</c>.
    /// </summary>

    /// <summary>
    /// Where you are, for a hobby that has such an idea — a show's season and episode, straight
    /// off the current pass like every other field on this row except the note preview.
    ///
    /// Null for games and films, and the card does not decide that from the nulls: it asks the
    /// hobby whether it formats progress at all. A game whose pass somehow carried a season
    /// would still print nothing, which is the right way round — the hobby says what it has.
    ///
    /// An anime carries an episode and <b>no season</b>, which used to be a shape the database
    /// refused: a cour is the entry, so where you are inside it is one number.
    /// </summary>
    int? SeasonNumber,

    int? EpisodeNumber,

    string? LatestNotePreview);
