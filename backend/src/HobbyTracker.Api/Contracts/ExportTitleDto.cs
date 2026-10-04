using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One title on your board as the spreadsheet export reads it: what the catalogue says about it,
/// and every pass of yours with every note.
///
/// <para>
/// <b>Facts, not words.</b> The client writes the sheets — which column a status is called,
/// which genre stands for a title, what a release window reads as, which day an instant falls
/// on here — because every one of those already has a home in <c>frontend/src/hobbies/</c> or
/// <c>lib/</c>, and a second copy on the server would be free to disagree with the board.
/// </para>
///
/// <para>
/// <b>The catalogue's half is a card's</b>, from the same expressions the board's projections
/// use: the name a card leads with, and its genres. The rest is what the games sheet prints and
/// a card does not — the developers, the release window, HowLongToBeat's four figures and its
/// id. Those are a game's, so a title of another hobby answers null for them, as a card's
/// downcasts do.
/// </para>
/// </summary>
public sealed record ExportTitleDto(
    int MediaId,

    /// <summary>The name a card leads with, which for anime is MAL's English one where there is one.</summary>
    string Title,

    /// <summary>As a card's: every genre the provider gave, alphabetically.</summary>
    IReadOnlyList<string>? Genres,

    /// <summary>The genre you chose for it, or null for the automatic pick.</summary>
    string? PrimaryGenre,

    /// <summary>A game's developers. Null for a title of a hobby with no such idea.</summary>
    IReadOnlyList<string>? Developers,

    /// <summary>
    /// The first day of the announced window — a day, never an instant, and so never run through
    /// the journal zone. Read with <see cref="ReleasePrecision"/>, which null means nobody has
    /// asked a provider: that reads as released, not as unannounced.
    /// </summary>
    DateOnly? ReleaseDate,

    ReleasePrecision? ReleasePrecision,

    decimal? HltbMainStoryHours,
    decimal? HltbMainExtraHours,
    decimal? HltbCompletionistHours,
    decimal? HltbAllStylesHours,

    /// <summary>HowLongToBeat's id for the game, once matched or pinned — what the link is built from.</summary>
    int? HltbId,

    /// <summary>
    /// Every pass of yours, newest first — <c>logged_at DESC, id DESC</c>, the rule the board
    /// decides "current" by, so the first is the pass the card shows. Each carries its notes,
    /// newest first.
    /// </summary>
    IReadOnlyList<LogEntryDto> Passes);
