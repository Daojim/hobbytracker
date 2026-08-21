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

    private static JournalClock ClockAt(string instant) => new(
        new FrozenTimeProvider { UtcNow = DateTimeOffset.Parse(instant) },
        Options.Create(new JournalOptions { TimeZone = "America/New_York" }));
}
