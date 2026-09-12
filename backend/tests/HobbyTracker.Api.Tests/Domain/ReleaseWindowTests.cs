using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Tests.Domain;

/// <summary>
/// The window arithmetic, on its own and away from any provider. Pure, so these are the cheapest
/// tests in the suite and the ones that pin the rule the calendar's ordering rests on.
/// </summary>
public sealed class ReleaseWindowTests
{
    [Fact]
    public void A_day_is_its_own_window()
    {
        var window = ReleaseWindow.For(new DateOnly(2026, 9, 26), ReleasePrecision.Day);

        window.Start.ShouldBe(new DateOnly(2026, 9, 26));
        window.End.ShouldBe(new DateOnly(2026, 9, 26));
        window.Precision.ShouldBe(ReleasePrecision.Day);
    }

    [Theory]
    [InlineData(2027, 3, 1)]
    [InlineData(2027, 3, 15)]
    [InlineData(2027, 3, 31)]
    public void A_month_spans_that_month_whichever_of_its_days_is_given(int year, int month, int day)
    {
        // The load-bearing case. IGDB gives the *last* day of a vague window — "Q3 2026" arrives
        // as 30 September and "2028" as 31 December, measured against the live API — where the
        // obvious assumption is the first. Deriving from the unit the date falls in is right
        // under either convention, so this is checked from both ends and the middle.
        var window = ReleaseWindow.For(new DateOnly(year, month, day), ReleasePrecision.Month);

        window.Start.ShouldBe(new DateOnly(2027, 3, 1));
        window.End.ShouldBe(new DateOnly(2027, 3, 31));
        window.Precision.ShouldBe(ReleasePrecision.Month);
    }

    [Fact]
    public void A_month_knows_how_long_February_is_in_a_leap_year()
    {
        var window = ReleaseWindow.For(new DateOnly(2028, 2, 10), ReleasePrecision.Month);

        window.Start.ShouldBe(new DateOnly(2028, 2, 1));
        window.End.ShouldBe(new DateOnly(2028, 2, 29));
    }

    [Theory]
    [InlineData(1, 1, 1, 3)]     // a day at the start of Q1
    [InlineData(5, 15, 4, 6)]    // a day in the middle of Q2
    [InlineData(9, 30, 7, 9)]    // Q3 as IGDB actually gives it: its last day
    [InlineData(12, 31, 10, 12)] // and Q4 the same way
    public void A_quarter_spans_its_three_months(int month, int day, int firstMonth, int lastMonth)
    {
        var window = ReleaseWindow.For(new DateOnly(2026, month, day), ReleasePrecision.Quarter);

        window.Start.ShouldBe(new DateOnly(2026, firstMonth, 1));
        window.End.ShouldBe(new DateOnly(2026, lastMonth, DateTime.DaysInMonth(2026, lastMonth)));
        window.Precision.ShouldBe(ReleasePrecision.Quarter);
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(6, 15)]
    [InlineData(12, 31)]
    public void A_year_spans_that_year_whichever_of_its_days_is_given(int month, int day)
    {
        var window = ReleaseWindow.For(new DateOnly(2028, month, day), ReleasePrecision.Year);

        window.Start.ShouldBe(new DateOnly(2028, 1, 1));
        window.End.ShouldBe(new DateOnly(2028, 12, 31));
        window.Precision.ShouldBe(ReleasePrecision.Year);
    }

    [Fact]
    public void A_date_nobody_has_announced_has_no_window_at_either_end()
    {
        // Both ends null is what ck_media_release_window demands of an Unknown row, and it is a
        // different state from a title nobody has asked about — which carries a null precision
        // and is not a window at all.
        ReleaseWindow.Unknown.Start.ShouldBeNull();
        ReleaseWindow.Unknown.End.ShouldBeNull();
        ReleaseWindow.Unknown.Precision.ShouldBe(ReleasePrecision.Unknown);
    }

    [Fact]
    public void Asking_for_an_unknown_window_around_a_day_ignores_the_day()
    {
        // Defensive rather than expected: nothing should call it this way, and if something
        // does, the constraint would refuse the row rather than let a half-window through.
        var window = ReleaseWindow.For(new DateOnly(2027, 3, 12), ReleasePrecision.Unknown);

        window.Start.ShouldBeNull();
        window.End.ShouldBeNull();
    }
}
