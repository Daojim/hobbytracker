using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One recorded pass through a title. Carries the media title so a client listing a journal
/// does not have to fetch each game separately.
/// </summary>
public sealed record LogEntryDto(
    int Id,
    int MediaId,
    string MediaTitle,
    LogStatus Status,
    decimal? Rating,

    /// <summary>Everything written during this pass, newest first.</summary>
    IReadOnlyList<NoteDto> Notes,

    /// <summary>What it was played on. See <see cref="LogEntry.Platform"/>.</summary>
    string? Platform,

    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,

    /// <summary>When the entry was written down. Server-stamped; see <see cref="LogEntry.LoggedAt"/>.</summary>
    DateTimeOffset LoggedAt,

    /// <summary>Where you are in a show. See <see cref="LogEntry.SeasonNumber"/>.</summary>
    int? SeasonNumber,

    /// <summary>Which episode of it. See <see cref="LogEntry.EpisodeNumber"/>.</summary>
    int? EpisodeNumber,

    /// <summary>How long this pass took you. See <see cref="LogEntry.HoursPlayed"/>.</summary>
    decimal? HoursPlayed)
{
    public static LogEntryDto From(LogEntry entry) => new(
        entry.Id,
        entry.MediaId,
        entry.Media?.Title ?? string.Empty,
        entry.Status,
        entry.Rating,
        // Newest first, here rather than in each query: four places load entries, and an
        // ordering repeated four times is an ordering that drifts. This app has already paid
        // for that lesson once, with which pass the board calls current.
        [
            .. entry.Notes
                .OrderByDescending(note => note.WrittenAt)
                .ThenByDescending(note => note.Id)
                .Select(NoteDto.From),
        ],
        entry.Platform,
        entry.StartedAt,
        entry.CompletedAt,
        entry.LoggedAt,
        entry.SeasonNumber,
        entry.EpisodeNumber,
        entry.HoursPlayed);
}

/// <summary>
/// Body for creating an entry. Several entries against one media id is expected, not a
/// conflict — that is what makes replays first-class rather than an overwrite.
/// </summary>
// Validation attributes sit on the constructor parameters, not behind [property:]. MVC
// refuses the latter outright — it cannot associate property metadata with a record's
// primary-constructor binding, so it throws rather than silently skipping the rules.
public sealed record CreateLogEntryRequest(
    [Range(1, int.MaxValue)] int MediaId,
    LogStatus Status,
    [Rating] decimal? Rating,
    [MaxLength(100)] string? Platform,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    [PlaytimeHours] decimal? HoursPlayed,

    // Defaulted, and only these two are. They are meaningless for two of the three
    // hobbies, so a games or films caller should not have to say so - the same argument
    // PassFields makes on the client about a control a hobby does not have. It changes
    // nothing on the wire: an absent JSON field binds to null either way, which is
    // exactly what PUT means by cleared.
    //
    // 0 is Specials rather than a missing value, so the floor is nought here and one
    // for the episode. Both are also enforced by ck_log_entries_season_range and
    // ck_log_entries_episode_range - reaching those means a 500, and this is a 400.
    //
    // An episode with **no** season is deliberately allowed, and used to be refused here.
    // Anime is why: MAL numbers each cour as its own entry, so the cour is the title and
    // "episode 7" says everything there is to say. The rule could not be made conditional on
    // the hobby either — a Postgres CHECK cannot hold a subquery and the hobby lives two
    // tables away on `media` — so it moved to where its other half always was, in each
    // hobby's form. Television's episode list is empty until a season is chosen.
    [Range(0, int.MaxValue)] int? SeasonNumber = null,
    [Range(1, int.MaxValue)] int? EpisodeNumber = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) =>
        [.. LogEntryRules.TimestampOrder(StartedAt, CompletedAt)];
}

/// <summary>
/// Body for replacing an entry. PUT rather than PATCH: an omitted field is cleared, which is
/// unambiguous, where PATCH cannot distinguish "clear the rating" from "leave it alone"
/// without an Optional&lt;T&gt; wrapper.
///
/// MediaId is deliberately absent — moving an entry to a different title is not an edit, it is
/// a delete and a create.
/// </summary>
public sealed record UpdateLogEntryRequest(
    LogStatus Status,
    [Rating] decimal? Rating,
    [MaxLength(100)] string? Platform,
    DateTimeOffset? StartedAt,
    DateTimeOffset? CompletedAt,
    [PlaytimeHours] decimal? HoursPlayed,

    // Defaulted, and only these two are. They are meaningless for two of the three
    // hobbies, so a games or films caller should not have to say so - the same argument
    // PassFields makes on the client about a control a hobby does not have. It changes
    // nothing on the wire: an absent JSON field binds to null either way, which is
    // exactly what PUT means by cleared.
    //
    // 0 is Specials rather than a missing value, so the floor is nought here and one
    // for the episode. Both are also enforced by ck_log_entries_season_range and
    // ck_log_entries_episode_range - reaching those means a 500, and this is a 400.
    //
    // An episode with **no** season is deliberately allowed, and used to be refused here.
    // Anime is why: MAL numbers each cour as its own entry, so the cour is the title and
    // "episode 7" says everything there is to say. The rule could not be made conditional on
    // the hobby either — a Postgres CHECK cannot hold a subquery and the hobby lives two
    // tables away on `media` — so it moved to where its other half always was, in each
    // hobby's form. Television's episode list is empty until a season is chosen.
    [Range(0, int.MaxValue)] int? SeasonNumber = null,
    [Range(1, int.MaxValue)] int? EpisodeNumber = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) =>
        [.. LogEntryRules.TimestampOrder(StartedAt, CompletedAt)];
}

/// <summary>Rules shared by the create and update bodies.</summary>
internal static class LogEntryRules
{
    /// <summary>
    /// A completion cannot precede its own start. The database enforces this too, via
    /// ck_log_entries_timestamp_order — but reaching it means a 500, and this is a 400.
    /// </summary>
    public static IEnumerable<ValidationResult> TimestampOrder(DateTimeOffset? started, DateTimeOffset? completed)
    {
        if (started is { } start && completed is { } completion && completion < start)
        {
            yield return new ValidationResult(
                "completedAt cannot be earlier than startedAt.",
                [nameof(CreateLogEntryRequest.CompletedAt)]);
        }
    }
}
