using HobbyTracker.Api.Infrastructure;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// The clock that decides what day it is here.
///
/// No host and no database: this is a pure conversion, and the endpoint tests that depend on it
/// are slower and say less about why a boundary lands where it does.
/// </summary>
public sealed class JournalClockTests
{
    [Theory]
    // Evening, EDT (UTC-4). UTC has rolled over; Eastern has not.
    [InlineData("2026-08-21T01:30:00Z", "2026-08-20")]
    // The same evening in January, EST (UTC-5). The window is an hour wider in winter, which is
    // why a fixed offset cannot serve both: -4 gets this row wrong, -5 gets the August row wrong.
    [InlineData("2026-01-15T04:30:00Z", "2026-01-14")]
    // Midday, where nothing is in doubt.
    [InlineData("2026-08-20T16:00:00Z", "2026-08-20")]
    [InlineData("2026-01-15T16:00:00Z", "2026-01-15")]
    // Either side of local midnight, to the minute.
    [InlineData("2026-08-20T03:59:00Z", "2026-08-19")]
    [InlineData("2026-08-20T04:00:00Z", "2026-08-20")]
    public void The_day_is_the_one_the_wall_clock_here_shows(string instant, string expected)
    {
        var clock = ClockAt(instant);

        clock.DayOf(clock.Now).ShouldBe(DateOnly.Parse(expected));
        clock.Today.ShouldBe(DateOnly.Parse(expected));
    }

    [Fact]
    public void The_offset_follows_daylight_saving_rather_than_being_fixed()
    {
        // Not a test of TimeZoneInfo so much as a statement of intent: if this ever reads -05:00
        // in August, someone has swapped the zone for an offset and the summer half is now wrong.
        ClockAt("2026-08-20T16:00:00Z").Zone
            .GetUtcOffset(DateTimeOffset.Parse("2026-08-20T16:00:00Z"))
            .ShouldBe(TimeSpan.FromHours(-4));

        ClockAt("2026-01-15T16:00:00Z").Zone
            .GetUtcOffset(DateTimeOffset.Parse("2026-01-15T16:00:00Z"))
            .ShouldBe(TimeSpan.FromHours(-5));
    }

    [Fact]
    public void A_year_runs_from_midnight_here_on_new_years_day_to_the_next_one()
    {
        // Half-open, and in instants: the year filter compares against these rather than asking
        // Postgres for a year, which would read the session's zone instead of this one. January
        // is always EST, so both ends are five hours after UTC's midnight.
        var span = ClockAt("2026-08-20T16:00:00Z").SpanOf(2026);

        span.From.ShouldBe(DateTimeOffset.Parse("2026-01-01T05:00:00Z"));
        span.To.ShouldBe(DateTimeOffset.Parse("2027-01-01T05:00:00Z"));
    }

    [Fact]
    public void The_years_some_instants_fall_in_are_the_ones_here_newest_first_and_once_each()
    {
        // 8pm on New Year's Eve here is 1am on New Year's Day in UTC, and it is the old year's.
        // Nulls are the dates a pass does not have, and belong to no year.
        var years = ClockAt("2026-08-20T16:00:00Z").YearsOf(
        [
            DateTimeOffset.Parse("2026-01-01T01:00:00Z"),
            null,
            DateTimeOffset.Parse("2024-06-01T16:00:00Z"),
            DateTimeOffset.Parse("2026-03-01T16:00:00Z"),
            DateTimeOffset.Parse("2024-07-01T16:00:00Z"),
        ]);

        years.ShouldBe([2026, 2025, 2024]);
    }

    private static JournalClock ClockAt(string instant) => new(
        new FrozenTimeProvider { UtcNow = DateTimeOffset.Parse(instant) },
        Options.Create(new JournalOptions { TimeZone = "America/New_York" }));
}
