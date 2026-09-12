using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Services;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Turning what IGDB sends into the window the calendar reads. Every shape below was measured
/// against the live API on 11 September 2026 rather than reasoned about — see <b>The release
/// calendar</b> in <c>docs/games-igdb.md</c>.
/// </summary>
public sealed class IgdbReleaseTests
{
    [Fact]
    public void Reads_the_precision_off_the_row_that_matches_the_first_release_date()
    {
        // 007 First Light's real shape: three day-precision rows for the announced date, and a
        // fourth carrying a vaguer "Q3 2026" for a platform nobody has pinned down. Taking
        // release_dates[0] would be right here by luck; matching on first_release_date is right
        // on purpose.
        var game = new IgdbGame
        {
            Id = 141114,
            Name = "007 First Light",
            FirstReleaseDate = UnixDay(2026, 5, 27),
            ReleaseDates =
            [
                new IgdbReleaseDate { Date = UnixDay(2026, 9, 30), DateFormat = Format("YYYYQ3") },
                new IgdbReleaseDate { Date = UnixDay(2026, 5, 27), DateFormat = Format("YYYYMMDD") },
            ],
        };

        var window = IgdbRelease.WindowOf(game);

        window.Precision.ShouldBe(ReleasePrecision.Day);
        window.Start.ShouldBe(new DateOnly(2026, 5, 27));
        window.End.ShouldBe(new DateOnly(2026, 5, 27));
    }

    [Fact]
    public void A_year_announced_as_its_last_day_still_spans_the_whole_year()
    {
        // The Witcher IV, verbatim: IGDB sends "2028" as 2028-12-31. Read as a day this would
        // put the game in the calendar's December, eleven months after it is actually due.
        var game = new IgdbGame
        {
            Id = 194662,
            Name = "The Witcher IV",
            FirstReleaseDate = UnixDay(2028, 12, 31),
            ReleaseDates =
            [
                new IgdbReleaseDate { Date = UnixDay(2028, 12, 31), DateFormat = Format("YYYY") },
            ],
        };

        var window = IgdbRelease.WindowOf(game);

        window.Precision.ShouldBe(ReleasePrecision.Year);
        window.Start.ShouldBe(new DateOnly(2028, 1, 1));
        window.End.ShouldBe(new DateOnly(2028, 12, 31));
    }

    [Fact]
    public void A_title_whose_only_rows_say_TBD_has_no_date_rather_than_a_wrong_one()
    {
        // The Elder Scrolls VI. Its TBD rows carry no `date` key at all — not a zero and not a
        // null — which is why the matching walks over rows with no date instead of comparing
        // against one.
        var game = new IgdbGame
        {
            Id = 81249,
            Name = "The Elder Scrolls VI",
            ReleaseDates =
            [
                new IgdbReleaseDate { DateFormat = Format("TBD") },
                new IgdbReleaseDate { DateFormat = Format("TBD") },
            ],
        };

        IgdbRelease.WindowOf(game).ShouldBe(ReleaseWindow.Unknown);
    }

    [Fact]
    public void A_title_IGDB_has_no_date_for_at_all_is_announced_with_no_date()
    {
        // Stellar Blade: Blood Rain, verbatim — announced at a showcase, hyped by 63 people, and
        // carrying no release_dates rows and no first_release_date whatsoever.
        //
        // This read as ReleaseWindow.None until 12 September 2026, on the argument that a game
        // with no rows at all is an obscure old title nobody filled in rather than an
        // announcement. Measured again against the live API, that does not hold: of the 53,096
        // main games with no release_dates, 250 have ever been rated by anybody and 4 by more
        // than two people. They are not games people played. The notable ones are announcements
        // nobody has dated — this, Okami Sequel, Black Myth: Zhong Kui, Physint.
        //
        // The shovelware worry was real and belongs to the discovery grid, which does not read
        // these columns. The calendar is drawn from Backlog, so the person's own act of adding a
        // title is already the filter, and nobody adds "Wubble Bubbles".
        var game = new IgdbGame { Id = 347557, Name = "Stellar Blade: Blood Rain" };

        IgdbRelease.WindowOf(game).ShouldBe(ReleaseWindow.Unknown);
    }

    [Fact]
    public void A_rumour_is_still_read_as_undated_rather_than_kept_off_the_calendar_here()
    {
        // Half-Life 3, which IGDB marks Rumored and gives no dates. It does not reach the
        // calendar — but that is ReleaseWindow.NotOutOn's decision, made from the status, and
        // not this mapping's. Keeping the two apart is what lets the window stay a statement
        // about dates alone.
        var game = new IgdbGame
        {
            Id = 28029,
            Name = "Half-Life 3",
            GameStatus = new IgdbGameStatus { Status = "Rumored" },
        };

        IgdbRelease.WindowOf(game).ShouldBe(ReleaseWindow.Unknown);
        IgdbRelease.StatusOf(game).ShouldBe(ReleaseStatus.Rumored);
    }

    [Fact]
    public void A_date_with_no_row_to_explain_it_is_read_as_a_day()
    {
        // The important default. IGDB prunes release_dates rows from old entries while keeping
        // first_release_date, and reading those as TBD would drop a game from 1998 into a
        // calendar of things that have not come out.
        var game = new IgdbGame
        {
            Id = 1020,
            Name = "Half-Life",
            FirstReleaseDate = UnixDay(1998, 11, 19),
        };

        var window = IgdbRelease.WindowOf(game);

        window.Precision.ShouldBe(ReleasePrecision.Day);
        window.Start.ShouldBe(new DateOnly(1998, 11, 19));
        window.End.ShouldBe(new DateOnly(1998, 11, 19));
    }

    [Fact]
    public void A_format_this_app_has_never_heard_of_is_read_as_a_day()
    {
        // IGDB has renamed this vocabulary once already. A format nobody here knows, alongside a
        // date IGDB is confident enough to put in first_release_date, is better read as that day
        // than as TBD: the failure of the first is a date shown too precisely, and of the second
        // a released game stuck in the calendar for ever.
        var game = new IgdbGame
        {
            Id = 7,
            Name = "Something New",
            FirstReleaseDate = UnixDay(2026, 4, 2),
            ReleaseDates =
            [
                new IgdbReleaseDate { Date = UnixDay(2026, 4, 2), DateFormat = Format("YYYYWW") },
            ],
        };

        IgdbRelease.WindowOf(game).Precision.ShouldBe(ReleasePrecision.Day);
    }

    [Fact]
    public void Reads_a_date_in_UTC_rather_than_in_the_journal_zone()
    {
        // A publisher announces a calendar day belonging to no timezone, and IGDB sends midnight
        // UTC of it. Localising would move every release back a day here. See **Time** in
        // docs/data-model.md.
        var game = new IgdbGame
        {
            Id = 52189,
            Name = "Grand Theft Auto VI",
            FirstReleaseDate = UnixDay(2026, 11, 19),
        };

        IgdbRelease.WindowOf(game).Start.ShouldBe(new DateOnly(2026, 11, 19));
    }

    [Theory]
    [InlineData("Released", ReleaseStatus.Released)]
    [InlineData("Cancelled", ReleaseStatus.Cancelled)]
    [InlineData("Rumored", ReleaseStatus.Rumored)]
    [InlineData("Delisted", ReleaseStatus.Delisted)]
    [InlineData("Offline", ReleaseStatus.Offline)]
    [InlineData("Alpha", ReleaseStatus.Alpha)]
    [InlineData("Beta", ReleaseStatus.Beta)]
    public void Reads_the_status_IGDB_spells_out(string igdb, ReleaseStatus expected)
    {
        var game = new IgdbGame { Id = 1, GameStatus = new IgdbGameStatus { Status = igdb } };

        IgdbRelease.StatusOf(game).ShouldBe(expected);
    }

    [Fact]
    public void Reads_early_access_despite_the_space_in_it()
    {
        // Measured: IGDB answers "Early Access", with a space, where every other value is one
        // word. An Enum.TryParse against the member name alone silently answers null for it —
        // and null means "IGDB said nothing", so an early-access game would fall back to its
        // window and sit in the calendar while people are playing it.
        var game = new IgdbGame
        {
            Id = 279051,
            GameStatus = new IgdbGameStatus { Status = "Early Access" },
        };

        IgdbRelease.StatusOf(game).ShouldBe(ReleaseStatus.EarlyAccess);
    }

    [Fact]
    public void A_game_IGDB_says_nothing_about_has_no_status()
    {
        // Ordinary rather than exceptional: neither Grand Theft Auto VI nor The Elder Scrolls VI
        // carries a game_status at all.
        IgdbRelease.StatusOf(new IgdbGame { Id = 1 }).ShouldBeNull();
    }

    [Fact]
    public void A_status_this_app_has_never_heard_of_is_no_status()
    {
        // Null falls back to the window, which is the safe direction: a word nobody here knows
        // should not be able to claim a game is out.
        var game = new IgdbGame { Id = 1, GameStatus = new IgdbGameStatus { Status = "Remastered" } };

        IgdbRelease.StatusOf(game).ShouldBeNull();
    }

    private static long UnixDay(int year, int month, int day) =>
        new DateTimeOffset(new DateTime(year, month, day, 0, 0, 0, DateTimeKind.Utc))
            .ToUnixTimeSeconds();

    private static IgdbDateFormat Format(string format) => new() { Format = format };
}
