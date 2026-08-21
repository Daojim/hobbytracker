namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// A clock stopped at an instant the test chooses, so a date assertion is about the rule rather
/// than about when the suite happened to run.
///
/// Hand-written rather than pulled from Microsoft.Extensions.TimeProvider.Testing: overriding one
/// method is the whole requirement, and FakeIgdbClient already sets the precedent that this
/// project's test doubles are small and local.
/// </summary>
public sealed class FrozenTimeProvider : TimeProvider
{
    /// <summary>
    /// Midday UTC, so the instant lands on the same calendar day in UTC and in Eastern and a test
    /// that does not care about the clock never trips over a boundary.
    ///
    /// Later than every date the suite arranges, because <c>ApplyTransitionDates</c> treats a
    /// start date in the future as the completion date. A fixture dated after this reads as
    /// "started tomorrow" and will fail for a reason that has nothing to do with what it tests.
    /// </summary>
    public DateTimeOffset UtcNow { get; set; } = new(2026, 9, 15, 16, 0, 0, TimeSpan.Zero);

    public override DateTimeOffset GetUtcNow() => UtcNow;
}
