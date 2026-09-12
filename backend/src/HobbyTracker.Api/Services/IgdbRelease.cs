using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Turning what IGDB says about a release into what the calendar reads.
///
/// Beside <see cref="IgdbRelevance"/> rather than inside <c>Integrations/Igdb/</c> for its
/// reason exactly: this is a policy about how much of a provider's answer to believe, not a
/// description of the wire, and the wire types are allowed this far up and no further.
///
/// Every shape it handles was measured against the live API on 11 September 2026. See
/// <b>The release calendar</b> in <c>docs/games-igdb.md</c>.
/// </summary>
public static class IgdbRelease
{
    /// <summary>IGDB's word for a date it has no opinion about. See <c>/v4/date_formats</c>.</summary>
    private const string TbdFormat = "TBD";

    /// <summary>
    /// The window IGDB has announced for a game.
    ///
    /// Three answers, and the difference between the last two is the one worth holding on to.
    /// A dated window puts a title in its month; <see cref="ReleaseWindow.Unknown"/> puts it
    /// under <i>No date yet</i>; and <see cref="ReleaseWindow.None"/> leaves it in Backlog,
    /// because nothing knows when it came out and guessing *soon* would be worse than admitting
    /// that.
    /// </summary>
    public static ReleaseWindow WindowOf(IgdbGame game)
    {
        if (game.FirstReleaseDate is not { } seconds)
        {
            // No date at all — and IGDB draws a distinction here that is worth keeping, because
            // the two shapes mean opposite things. Measured against the live API:
            //
            //   - A game IGDB models as *announced but undated* carries explicit TBD rows in
            //     release_dates. That is genuinely unreleased, and belongs on the calendar.
            //   - A game IGDB simply has no date for carries no release_dates at all. Those are
            //     overwhelmingly obscure titles that came out years ago and nobody filled in —
            //     "Wubble Bubbles", "Soccer Cup 2022". Calling those *coming soon* would fill
            //     the calendar with shovelware nobody is waiting for.
            //
            // So the second shape answers with no window at all, which reads as released and
            // leaves the title in Backlog. It also keeps it out of the nightly sweep, which is
            // right for the same reason `games.hltb_checked_at` exists: re-asking for ever about
            // a title the provider has nothing to say about never terminates.
            var announcedUndated = (game.ReleaseDates ?? [])
                .Any(row => row.DateFormat?.Format == TbdFormat);

            return announcedUndated ? ReleaseWindow.Unknown : ReleaseWindow.None;
        }

        var day = DayOf(seconds);

        // Which of the rows is this date? They are one per platform and per region, so the one
        // that agrees with first_release_date is the one being talked about — and rows with no
        // date of their own (TBD) can never agree, which is what skips them.
        var announced = (game.ReleaseDates ?? [])
            .FirstOrDefault(candidate => candidate.Date == seconds);

        // A date IGDB is confident enough to put in first_release_date, with no row to say how
        // precisely it is known. Old entries get their release_dates pruned while keeping the
        // date, so reading this as TBD would drop a game from 1998 into a calendar of things
        // that have not come out. A day is the honest reading and the safe one.
        if (announced?.DateFormat?.Format is not { } format)
        {
            return ReleaseWindow.For(day, ReleasePrecision.Day);
        }

        return PrecisionOf(format) switch
        {
            ReleasePrecision.Unknown => ReleaseWindow.Unknown,
            var precision => ReleaseWindow.For(day, precision),
        };
    }

    /// <summary>
    /// What IGDB says about the title's life, or null when it says nothing — which is most of
    /// the time, and ordinary.
    ///
    /// Null is also the answer for a word this app has never heard of, and that is the safe
    /// direction: an unrecognised status falls back to the window rather than being allowed to
    /// claim a game is out.
    /// </summary>
    public static ReleaseStatus? StatusOf(IgdbGame game) => game.GameStatus?.Status switch
    {
        "Released" => ReleaseStatus.Released,
        "Alpha" => ReleaseStatus.Alpha,
        "Beta" => ReleaseStatus.Beta,

        // The space is not a typo and not ours to normalise away. Parsing against the enum
        // member name would answer null here, and null means "IGDB said nothing" — so an
        // early-access game would fall back to its window and sit in the calendar while people
        // are already playing it.
        "Early Access" => ReleaseStatus.EarlyAccess,

        "Offline" => ReleaseStatus.Offline,
        "Cancelled" => ReleaseStatus.Cancelled,
        "Rumored" => ReleaseStatus.Rumored,
        "Delisted" => ReleaseStatus.Delisted,
        _ => null,
    };

    /// <summary>
    /// IGDB's eight format names. Mapped from the string the <c>date_formats</c> endpoint
    /// answers with rather than from the deprecated enum's integers, which are published
    /// nowhere for the endpoint that replaced it.
    ///
    /// An unrecognised format answers <see cref="ReleasePrecision.Day"/> rather than Unknown,
    /// because it is only ever reached alongside a date IGDB was confident about.
    /// </summary>
    private static ReleasePrecision PrecisionOf(string format) => format switch
    {
        "YYYYMMDD" => ReleasePrecision.Day,
        "YYYYMM" => ReleasePrecision.Month,
        "YYYY" => ReleasePrecision.Year,
        "YYYYQ1" or "YYYYQ2" or "YYYYQ3" or "YYYYQ4" => ReleasePrecision.Quarter,
        "TBD" => ReleasePrecision.Unknown,
        _ => ReleasePrecision.Day,
    };

    /// <summary>
    /// The calendar day IGDB means, read in UTC.
    ///
    /// Not the journal zone, and this is the trap the whole feature turns on: a publisher
    /// announces a day belonging to no timezone, and IGDB sends midnight UTC of it. Localising
    /// 2026-09-26T00:00:00Z to Eastern gives the 25th — a date nobody announced. See <b>Time</b>
    /// in <c>docs/data-model.md</c>.
    /// </summary>
    private static DateOnly DayOf(long unixSeconds) =>
        DateOnly.FromDateTime(DateTimeOffset.FromUnixTimeSeconds(unixSeconds).UtcDateTime);
}
