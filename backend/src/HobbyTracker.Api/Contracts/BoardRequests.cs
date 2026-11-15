using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Moving a title to a board column. The caller names the target column — the server decides
/// whether that edits the current entry or starts a new one, and works out the dates, so no
/// client has to know which entry is current.
///
/// <para>
/// <b><paramref name="NotFinished"/> is the one thing more a caller can say</b>, and only about a
/// finished pass: the finish never happened. Leaving Completed then moves that pass rather than
/// starting a new one beside it, and takes its finish date away. Without it, leaving Completed is
/// a replay, as it always was. It means nothing to a pass that is not finished.
/// </para>
/// </summary>
public sealed record StatusTransitionRequest(LogStatus Status, bool NotFinished = false);

/// <summary>
/// Putting a title on your board, in a column. The caller names the column, as a move does: the
/// dates the first pass carries are worked out by the rule a drag into that column follows, so a
/// client cannot add something to Playing with no start.
///
/// <para>
/// <b>An add to Completed names its finish</b> (#24), because the check mark asks when: today,
/// which is a drag's rule and what saying nothing means; a year, <paramref name="CompletedYear"/>,
/// kept as the year it is; or none, <paramref name="Undated"/>, for <i>I don't remember</i>, the
/// state a finish cleared by hand already has. And the hours it took, if they are known. Only an
/// add to Completed says any of that — nothing else has a finish to name.
/// </para>
///
/// Any of the five columns. Which ones a tile offers is the client's decision, not the API's.
/// </summary>
// Validation attributes on the constructor parameters, not behind [property:] — see
// CreateLogEntryRequest for why MVC insists.
public sealed record AddToBoardRequest(
    LogStatus Status,
    int? CompletedYear = null,
    bool Undated = false,
    [PlaytimeHours] decimal? HoursPlayed = null) : IValidatableObject
{
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Status != LogStatus.Completed)
        {
            if (CompletedYear is not null)
            {
                yield return new ValidationResult(
                    "Only an add to Completed names a finish.", [nameof(CompletedYear)]);
            }

            if (Undated)
            {
                yield return new ValidationResult(
                    "Only an add to Completed names a finish.", [nameof(Undated)]);
            }

            if (HoursPlayed is not null)
            {
                yield return new ValidationResult(
                    "Only an add to Completed takes hours.", [nameof(HoursPlayed)]);
            }

            yield break;
        }

        if (CompletedYear is not null && Undated)
        {
            yield return new ValidationResult(
                "A finish is a year or none, never both.", [nameof(Undated)]);
        }

        // The year boxes' rule, in their words: a year that has happened, here.
        var thisYear = validationContext.GetRequiredService<IJournalClock>().Today.Year;
        if (CompletedYear is { } year && (year < LogEntryRules.FirstYear || year > thisYear))
        {
            yield return new ValidationResult(
                LogEntryRules.YearRule(thisYear), [nameof(CompletedYear)]);
        }
    }
}

/// <summary>
/// The full desired order of one board column, top first.
///
/// Sending the whole column rather than a move-plus-index is idempotent and immune to
/// off-by-one bugs, and at the size a personal backlog reaches the extra ids cost nothing.
/// </summary>
public sealed record ReorderRequest(
    [Required(AllowEmptyStrings = false)] string Hobby,
    LogStatus Status,
    [MinLength(1)] IReadOnlyList<int> MediaIds);
