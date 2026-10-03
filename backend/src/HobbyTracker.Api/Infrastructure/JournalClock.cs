using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Infrastructure;

/// <summary>
/// What time it is, and what day that makes it here.
///
/// Exists so that the rules deciding a log entry's dates have somewhere to ask, rather than
/// reaching for DateTime.UtcNow at the point of use — which is both untestable and, four hours
/// out of every twenty-four, wrong.
///
/// It is also the one place a year meets an instant, in both directions: <see cref="SpanOf"/>
/// turns a year asked for into the instants it covers, and <see cref="YearsOf"/> turns stored
/// instants into the years they fall in. The board and the Stats page each do both, and doing
/// them here is what keeps the two from disagreeing about which year 8pm on New Year's Eve is.
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

    /// <summary>
    /// The instants a calendar year spans here, for comparing stored instants against — never
    /// <c>EXTRACT(year FROM …)</c>, which reads the database session's zone rather than this one.
    /// </summary>
    YearSpan SpanOf(int year);

    /// <summary>
    /// The years here that some instants fall in, newest first and once each. A null is a date a
    /// pass does not have, and belongs to no year.
    /// </summary>
    IReadOnlyList<int> YearsOf(IEnumerable<DateTimeOffset?> instants);
}

/// <summary>
/// The instants a calendar year spans here. Half-open, [From, To), so the boundary belongs to
/// exactly one year however the clocks moved during it.
/// </summary>
public readonly record struct YearSpan(DateTimeOffset From, DateTimeOffset To);

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

    public YearSpan SpanOf(int year) => new(FirstInstantOf(year), FirstInstantOf(year + 1));

    // The year becomes instants here, and the instants become years here, rather than either
    // happening in SQL. Postgres can only localise a timestamptz through AT TIME ZONE, which is
    // STABLE rather than IMMUTABLE — it will not go in an index or a generated column — and a bare
    // date_part reads whatever zone the session was opened with. At the size a personal catalogue
    // reaches, reading a few hundred instants out to file them is a cheap price for the zone
    // staying explicit.
    public IReadOnlyList<int> YearsOf(IEnumerable<DateTimeOffset?> instants) =>
    [
        .. instants
            .Where(instant => instant is not null)
            .Select(instant => DayOf(instant!.Value).Year)
            .Distinct()
            .OrderByDescending(year => year),
    ];

    /// <summary>
    /// Midnight on New Year's Day here. The offset is asked of the zone at that moment rather
    /// than assumed, so a year is the right length even though one of its days is 23 hours and
    /// another is 25.
    /// </summary>
    private DateTimeOffset FirstInstantOf(int year)
    {
        var midnight = new DateTime(year, 1, 1, 0, 0, 0, DateTimeKind.Unspecified);
        return new DateTimeOffset(midnight, Zone.GetUtcOffset(midnight)).ToUniversalTime();
    }
}
