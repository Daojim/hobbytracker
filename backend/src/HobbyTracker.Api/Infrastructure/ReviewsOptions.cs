using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The journal's OpenCritic and Steam rows: how long a page found missing waits before it is looked
/// for again, and how long what each page says is kept. Every value is a working default; the
/// block exists to say which knobs there are. The providers' own settings are under their names.
/// </summary>
public sealed class ReviewsOptions
{
    public const string SectionName = "Reviews";

    /// <summary>
    /// How long a game found to have no OpenCritic id, or no Steam page, waits before a journal looks
    /// again — HowLongToBeat's <c>RecheckAfterDays</c>, for the same reason. A game not out often has
    /// no OpenCritic id on Wikidata yet, and a console game can come to Steam. A page found is never
    /// looked for again.
    /// </summary>
    [Range(1, 365)]
    public int RecheckAfterDays { get; set; } = 30;

    /// <summary>
    /// How long what OpenCritic and Steam say is kept, under each provider's own id, in hours. It is
    /// asked for again on a new journal day regardless, so this is a ceiling. A day, because a score
    /// moves slowly and OpenCritic's free plan is 200 requests a day.
    /// </summary>
    [Range(1, 48)]
    public int KeepVerdictsHours { get; set; } = 24;
}
