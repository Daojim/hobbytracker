namespace HobbyTracker.Api.Domain;

/// <summary>
/// How exactly a title's release day is known — which is a fact worth storing because a
/// publisher routinely announces a quarter or a year and nothing finer.
///
/// It is what stops the calendar inventing a day nobody said. "Q1 2027" is stored as the
/// window 1 January to 31 March with this reading <see cref="Quarter"/>, so the agenda can
/// order on the first day of the window while printing only what was actually announced.
///
/// <para>
/// <b>Null on <see cref="Media.ReleasePrecision"/> is a third state, and the most important
/// one.</b> It means nobody has asked the provider yet, and it must read as <i>released</i>:
/// every row that existed before the migration carries it, and treating those as unreleased
/// would empty every board's Backlog column on deploy day with no error anywhere.
/// <see cref="Unknown"/> is the different claim that the provider was asked and said TBD.
/// This is <c>games.hltb_checked_at</c>'s distinction exactly.
/// </para>
///
/// Persisted as text (see MediaConfiguration), so reordering this enum can never silently
/// reinterpret existing rows — <see cref="LogStatus"/>'s reasoning.
/// </summary>
public enum ReleasePrecision
{
    /// <summary>A day was announced. The window is that single day.</summary>
    Day,

    /// <summary>A month was announced. The window is the 1st to the last of it.</summary>
    Month,

    /// <summary>A quarter was announced. The window is its three months.</summary>
    Quarter,

    /// <summary>A year was announced. The window is 1 January to 31 December.</summary>
    Year,

    /// <summary>
    /// The provider was asked and had no date to give. Both ends of the window are null, which
    /// is why the check constraint spells this case out rather than letting it share a shape
    /// with a half-written row.
    /// </summary>
    Unknown,
}
