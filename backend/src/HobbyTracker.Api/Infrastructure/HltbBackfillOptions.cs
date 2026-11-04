using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// The HowLongToBeat backfill, run once a day by <see cref="HltbBackfillWorker"/>.
///
/// Every setting has a working default, on <c>HltbOptions</c>'s reasoning: there are no secrets
/// here, so nothing has to be supplied for the app to boot and the test host needs no section
/// invented for it.
/// </summary>
public sealed class HltbBackfillOptions
{
    public const string SectionName = "HltbBackfill";

    /// <summary>
    /// Its own switch, besides <c>Hltb:Enabled</c>, and off in <c>appsettings.Development.json</c>.
    ///
    /// <c>Hltb:Enabled</c> stops everything, for the day HowLongToBeat breaks unofficial clients
    /// again. This stops only the asking nobody asked for: somebody running the app locally to
    /// look at the board should not become traffic to a site that would rather not be read by a
    /// program, while adding a title there still asks about it. Off in the end-to-end run too —
    /// see <c>HltbBackfill__Enabled</c> in <c>playwright.config.ts</c>.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// How long between runs. Daily, so a title comes due on the day thirty days after its own
    /// last ask, and the library is asked about a little at a time rather than all at once.
    /// </summary>
    [Range(1, 720)]
    public int IntervalHours { get; set; } = 24;

    /// <summary>
    /// How long to wait before the first run. Not nought, for the release sweep's reason: the
    /// first tick would otherwise race the migration the host runs at startup.
    /// </summary>
    [Range(0, 1440)]
    public int StartupDelayMinutes { get; set; } = 5;
}
