using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The nightly sweep that keeps the release calendar honest.
///
/// Every setting has a working default, on <c>HltbOptions</c>'s reasoning: there are no secrets
/// here, so nothing has to be supplied for the app to boot and the test host needs no section
/// invented for it.
/// </summary>
public sealed class ReleaseRefreshOptions
{
    public const string SectionName = "ReleaseRefresh";

    /// <summary>
    /// The kill switch, and the reason this is configuration rather than a constant.
    ///
    /// IGDB allows four requests a second against an app anybody can sign up to, and this is the
    /// only traffic the app generates that nobody asked for. Turning it off should not need a
    /// release. It is also how the end-to-end run keeps a timer from rewriting rows mid-spec —
    /// see <c>ReleaseRefresh__Enabled</c> in <c>playwright.config.ts</c>.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// How long between sweeps. A plain interval rather than a time of day, deliberately: "daily"
    /// does not have to mean 3am Eastern, and keeping the journal zone out of the worker keeps
    /// the count in <b>Time</b> in <c>docs/data-model.md</c> honest.
    /// </summary>
    [Range(1, 720)]
    public int IntervalHours { get; set; } = 24;

    /// <summary>
    /// How long to wait before the first sweep. Not nought: the first tick would otherwise race
    /// the migration the host runs at startup and the first requests off a cold start, and a
    /// batch of 500-id lookups is not what a just-woken container should be doing.
    /// </summary>
    [Range(0, 1440)]
    public int StartupDelayMinutes { get; set; } = 5;
}
