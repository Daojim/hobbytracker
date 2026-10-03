namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A year of one hobby, for the Stats page: everything you finished, how long you took against
/// how long it takes, how much of what you started you finished, and what is waiting.
///
/// <para>
/// <b>Every playthrough, not every title.</b> The board shows a title once, by its latest pass,
/// because it is about where things are now. This is about what happened: a game finished in
/// March and replayed in June is still a March finish, and one finished twice is two. So a year's
/// numbers never change because of something done later, which is what a year in review needs.
/// The Completed column can show a different count for the same year, and that is why.
/// </para>
///
/// <para>
/// <b>Facts, not words, and instants, not days.</b> Which month a finish falls in is the journal
/// zone's question, and the server does not ask it: the client buckets <see cref="Finished"/>
/// with <c>lib/time.ts</c>, as it renders every other instant. Two things come added up, because
/// each has a home on the server already — <see cref="Hours"/> by the column header's rules, and
/// <see cref="Completion"/>, which is over passes that are mostly not finishes.
/// </para>
/// </summary>
public sealed record StatsDto(
    /// <summary>
    /// Every pass you finished in the year, oldest first. With no year, every finished pass,
    /// including one with no date, which sorts last.
    /// </summary>
    IReadOnlyList<FinishDto> Finished,

    /// <summary>
    /// Your hours against how long the titles take, over <see cref="Finished"/>, by the rules
    /// Completed's header uses: a title with no figure is left out and counted, never added as
    /// nought, and the comparison is over the passes that have both. Hours are per pass, so a game
    /// finished twice brings both playthroughs' hours.
    /// </summary>
    ColumnHours Hours,

    /// <summary>What became of the passes started in the year. See <see cref="CompletionDto"/>.</summary>
    CompletionDto Completion,

    /// <summary>
    /// Your Backlog column as the board draws it, oldest first, and when each title arrived in it.
    /// The same whatever year is asked for: Backlog belongs to no year, on the board or here.
    /// </summary>
    IReadOnlyList<BacklogTitleDto> Backlog);

/// <summary>One finished pass.</summary>
public sealed record FinishDto(
    int MediaId,

    /// <summary>The name a card leads with, which for anime is MAL's English one where there is one.</summary>
    string Title,

    string? CoverUrl,

    /// <summary>An instant. Null only for a pass marked finished with its date cleared.</summary>
    DateTimeOffset? CompletedAt,

    decimal? Rating,

    /// <summary>How long this pass took you.</summary>
    decimal? HoursPlayed,

    /// <summary>
    /// How long the title takes, as its card prints it: HowLongToBeat's All Styles figure for a
    /// game, the runtime for a film or a show. <see cref="LibraryItemDto.LengthHours"/>'s value.
    /// </summary>
    decimal? LengthHours);

/// <summary>
/// The passes started in the year, by where each is now. The share finished is
/// <see cref="Finished"/> over the three added together, and the client works it out: with none
/// started there is no rate at all, which is not the same as a rate of nought.
///
/// <para>
/// <b>Started</b> is the pass's start, or its finish when it has no start: adding a title straight
/// to Completed stamps a finish and nothing else, and a finish began no later than it ended. A
/// pass in Backlog has not started, whatever date it carries — the move into Backlog clears both,
/// so a date there is left over from an edit, and the board ignores it the same way.
/// </para>
/// </summary>
public sealed record CompletionDto(int Finished, int Going, int Dropped);

/// <summary>A title in your Backlog column, and how long it has waited there.</summary>
public sealed record BacklogTitleDto(
    int MediaId,
    string Title,
    string? CoverUrl,

    /// <summary>When the pass was made: when this title went on your board, this time round.</summary>
    DateTimeOffset LoggedAt,

    /// <summary>
    /// When it last arrived in Backlog, from the column history. Null when the history does not
    /// say — a pass made before 1 October 2026, when recording began, and never moved since —
    /// and then <see cref="LoggedAt"/> is the most that can be claimed.
    /// </summary>
    DateTimeOffset? InBacklogSince);
