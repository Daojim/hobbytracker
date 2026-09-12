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
    /// Two answers, not three. A dated window puts a title in its month, and
    /// <see cref="ReleaseWindow.Unknown"/> puts it under <i>No date yet</i>.
    /// <see cref="ReleaseWindow.None"/> is unreachable from here on purpose, which is what makes
    /// a null precision mean the one thing it is documented to mean: <b>nobody has asked</b>.
    /// </summary>
    public static ReleaseWindow WindowOf(IgdbGame game)
    {
        if (game.FirstReleaseDate is not { } seconds)
        {
            // Asked, and IGDB has no date. IGDB derives first_release_date from release_dates,
            // so its absence already says every row is dateless — whether an editor also wrote
            // "TBD" down in one is a fact about how completely the entry was filled in, not
            // about the game.
            //
            // Those two shapes were read as opposites until 12 September 2026: a game with no
            // rows at all answered None, to keep the calendar clear of obscure titles that came
            // out years ago and nobody filled in — "Wubble Bubbles", "Soccer Cup 2022".
            //
            // Measured again against the live API, that premise does not hold. Of the 53,096
            // main games with no release_dates, 250 have ever been rated by anybody and 4 by
            // more than two people; they are not games people played, they are entries with
            // nothing behind them. The notable ones are announcements nobody has dated — Stellar
            // Blade: Blood Rain, Okami Sequel, Black Myth: Zhong Kui, Physint — and those were
            // the titles being thrown away.
            //
            // The shovelware worry was sound and belongs to the discovery grid, which does not
            // read these columns. This calendar is drawn from Backlog, so the person's own act
            // of adding a title is already the filter, and nobody adds "Wubble Bubbles".
            //
            // The rumours in that set — Half-Life 3 and the twenty others IGDB marks Rumored —
            // are kept off the calendar by their status, in ReleaseWindow.NotOutOn, and not
            // here. This answers what is known about the date, and a rumour's date is unknown.
            return ReleaseWindow.Unknown;
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
        TbdFormat => ReleasePrecision.Unknown,
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
