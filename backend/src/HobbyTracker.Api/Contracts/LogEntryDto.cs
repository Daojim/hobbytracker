using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

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
    decimal? HoursPlayed,

    /// <summary>
    /// The year it began, where that is all anybody remembers, and then <see cref="StartedAt"/>
    /// is null. See <see cref="LogEntry.StartedYear"/>.
    /// </summary>
    int? StartedYear,

    /// <summary>
    /// The year it finished, where that is all anybody remembers, and then
    /// <see cref="CompletedAt"/> is null. See <see cref="LogEntry.CompletedYear"/>.
    /// </summary>
    int? CompletedYear)
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
        entry.HoursPlayed,
        entry.StartedYear,
        entry.CompletedYear);
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
    [Range(1, int.MaxValue)] int? EpisodeNumber = null,

    // The years, for a date nobody remembers the day of (#24). Defaulted, as the season is, so a
    // caller with no such date need not say so; on the wire an absent year binds to null, which
    // is what PUT means by cleared. Never beside a day for the same date — LogEntryRules.
    int? StartedYear = null,
    int? CompletedYear = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) =>
        [.. LogEntryRules.Dates(
            StartedAt, StartedYear, CompletedAt, CompletedYear,
            // The request's own services, which MVC hands every validation it runs: this year, and
            // the year a day is in, are both the journal clock's to say.
            validationContext.GetRequiredService<IJournalClock>())];
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
    [Range(1, int.MaxValue)] int? EpisodeNumber = null,

    // The years, as on the create body. The autosave sends both every time, because PUT clears
    // what it is not sent.
    int? StartedYear = null,
    int? CompletedYear = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext) =>
        [.. LogEntryRules.Dates(
            StartedAt, StartedYear, CompletedAt, CompletedYear,
            // The request's own services, which MVC hands every validation it runs: this year, and
            // the year a day is in, are both the journal clock's to say.
            validationContext.GetRequiredService<IJournalClock>())];
}

/// <summary>
/// Rules shared by the create and update bodies, about a pass's two dates: each a day or a year,
/// a year one that has happened, and the finish no earlier than the start.
///
/// <para>
/// <b>Each is a 400 before it can be a 500.</b> The database holds what it can — never a day and
/// a year for one date, no year before <see cref="FirstYear"/>, a finish year no earlier than a
/// start year, a finish day no earlier than a start day — and reaching one of those is a 500. What
/// it cannot hold is here alone: this year's ceiling, which a check cannot ask because it is not
/// immutable, and a day against a year, which needs the zone.
/// </para>
/// </summary>
internal static class LogEntryRules
{
    /// <summary>
    /// The earliest year a date can be kept as: picked at the #24 build, because it refuses only
    /// a typo, for anybody alive, on every board. <c>ck_log_entries_years_range</c> holds it too.
    /// </summary>
    public const int FirstYear = 1900;

    /// <summary>
    /// What a year box says when it cannot take what is in it — the user's pick at the #24 build,
    /// one line for every case. The journal and the check mark's panel say it word for word.
    /// </summary>
    public static string YearRule(int thisYear) => $"A year from {FirstYear} to {thisYear}.";

    /// <summary>
    /// What the finish says when it is before the start, on every board and for a day as much as a
    /// year: round three's pick at the #24 workshop, and the form's words, so a refusal that reaches
    /// the field reads the same as one the form caught first.
    /// </summary>
    public const string OrderRule = "Cannot be earlier than Started.";

    public static IEnumerable<ValidationResult> Dates(
        DateTimeOffset? startedAt,
        int? startedYear,
        DateTimeOffset? completedAt,
        int? completedYear,
        IJournalClock clock)
    {
        // A day or a year, never both: a reader shown both would have to pick one, and two readers
        // picking differently is a card and a year view disagreeing. ck_log_entries_*_day_or_year.
        var startIsOne = startedAt is null || startedYear is null;
        var finishIsOne = completedAt is null || completedYear is null;

        if (!startIsOne)
        {
            yield return new ValidationResult(
                "A start is a day or a year, never both.",
                [nameof(CreateLogEntryRequest.StartedYear)]);
        }

        if (!finishIsOne)
        {
            yield return new ValidationResult(
                "A finish is a day or a year, never both.",
                [nameof(CreateLogEntryRequest.CompletedYear)]);
        }

        // A year that has happened, here: a finish is never in the future, and nor is a start. This
        // year is today's here, the release calendar's idea of today, so this adds no place where
        // the zone is applied.
        var thisYear = clock.Today.Year;
        bool Happened(int? year) => year is null || (year >= FirstYear && year <= thisYear);

        if (!Happened(startedYear))
        {
            yield return new ValidationResult(
                YearRule(thisYear), [nameof(CreateLogEntryRequest.StartedYear)]);
        }

        if (!Happened(completedYear))
        {
            yield return new ValidationResult(
                YearRule(thisYear), [nameof(CreateLogEntryRequest.CompletedYear)]);
        }

        // The order, between dates that are each one thing and each a year that has happened —
        // anything else has been refused above, and SpanOf cannot hold a year past 9998.
        if (!startIsOne || !finishIsOne || !Happened(startedYear) || !Happened(completedYear))
        {
            yield break;
        }

        if (OutOfOrder(startedAt, startedYear, completedAt, completedYear, clock))
        {
            yield return new ValidationResult(
                OrderRule,
                [completedAt is null && completedYear is not null
                    ? nameof(CreateLogEntryRequest.CompletedYear)
                    : nameof(CreateLogEntryRequest.CompletedAt)]);
        }
    }

    /// <summary>
    /// Whether the finish is before the start, across the two kinds a date can be.
    ///
    /// A day against a day is the instants; a year against a year is the numbers. A day against a
    /// year is the day's year here, asked of <see cref="IJournalClock.SpanOf"/>, which is already
    /// where a year meets an instant: a start day after the finish year's last instant, or a finish
    /// day before the start year's first. So the places the zone is applied stay four.
    /// </summary>
    private static bool OutOfOrder(
        DateTimeOffset? startedAt,
        int? startedYear,
        DateTimeOffset? completedAt,
        int? completedYear,
        IJournalClock clock) =>
        (startedAt, startedYear, completedAt, completedYear) switch
        {
            ({ } start, _, { } finish, _) => finish < start,
            (_, { } start, _, { } finish) => finish < start,
            ({ } start, _, _, { } finish) => start >= clock.SpanOf(finish).To,
            (_, { } start, { } finish, _) => finish < clock.SpanOf(start).From,
            _ => false,
        };
}
