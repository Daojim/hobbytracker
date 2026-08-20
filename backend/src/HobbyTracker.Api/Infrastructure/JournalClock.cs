using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// What time it is, and what day that makes it here.
///
/// Exists so that the rules deciding a log entry's dates have somewhere to ask, rather than
/// reaching for DateTime.UtcNow at the point of use — which is both untestable and, four hours
/// out of every twenty-four, wrong.
/// </summary>
public interface IJournalClock
{
    /// <summary>Now, as an instant.</summary>
    DateTimeOffset Now { get; }

    /// <summary>The zone the journal thinks in. Needed wherever an instant becomes a calendar answer.</summary>
    TimeZoneInfo Zone { get; }

    /// <summary>The calendar day an instant falls on, in <see cref="Zone"/>.</summary>
    DateOnly DayOf(DateTimeOffset instant);

    /// <summary>Today, in <see cref="Zone"/>.</summary>
    DateOnly Today { get; }
}

/// <inheritdoc />
public sealed class JournalClock : IJournalClock
{
    private readonly TimeProvider _time;

    public JournalClock(TimeProvider time, IOptions<JournalOptions> options)
    {
        _time = time;

        // Resolved once, and allowed to throw: JournalOptions is validated at startup, so an
        // unresolvable id fails at boot naming the setting rather than on the first drag.
        Zone = TimeZoneInfo.FindSystemTimeZoneById(options.Value.TimeZone);
    }

    public TimeZoneInfo Zone { get; }

    public DateTimeOffset Now => _time.GetUtcNow();

    public DateOnly DayOf(DateTimeOffset instant) =>
        DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(instant, Zone).DateTime);

    public DateOnly Today => DayOf(Now);
}
