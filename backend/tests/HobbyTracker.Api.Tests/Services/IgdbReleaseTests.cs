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
    public void A_title_IGDB_has_no_date_for_at_all_gets_no_window_rather_than_a_TBD()
    {
        // Measured, and it is the distinction this mapping turns on. IGDB models *announced but
        // undated* as explicit TBD rows — the case above. A game with no date and no rows at all
        // is a different thing: an obscure title nobody filled in, and the live API is full of
        // them. "Wubble Bubbles", "Soccer Cup 2022" and "Flashy Maze" all came back that way.
        //
        // Reading those as TBD would fill the calendar with shovelware nobody is waiting for,
        // and — worse — the nightly sweep would go on asking about them for ever, since nothing
        // would ever give them a date. No window leaves them in Backlog and out of the sweep.
        var game = new IgdbGame { Id = 94975, Name = "Wubble Bubbles" };

        IgdbRelease.WindowOf(game).ShouldBe(ReleaseWindow.None);
        IgdbRelease.WindowOf(game).Precision.ShouldBeNull();
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
