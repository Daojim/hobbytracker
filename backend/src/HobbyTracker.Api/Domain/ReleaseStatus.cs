namespace HobbyTracker.Api.Domain;

/// <summary>
/// What the provider says about a title's life, separately from its date.
///
/// It exists because a date alone answers the question badly. A game IGDB still lists only as
/// "2026" is, by the window rule, not out until 31 December — so a title that actually shipped
/// in March would sit in the calendar for nine months on the strength of an entry nobody had
/// sharpened. The provider's own word settles that, and the window is the fallback for when it
/// is silent.
///
/// <para>
/// The vocabulary is IGDB's, mapped from the string its <c>game_statuses</c> endpoint answers
/// rather than from the integer of the deprecated <c>status</c> enum — see <b>The release
/// calendar</b> in <c>docs/games-igdb.md</c>. Null means the provider said nothing, which is
/// ordinary rather than an error: most released games carry no status at all.
/// </para>
///
/// Persisted as text, for <see cref="ReleasePrecision"/>'s reason.
/// </summary>
public enum ReleaseStatus
{
    Released,
    Alpha,
    Beta,
    EarlyAccess,
    Offline,

    /// <summary>
    /// Announced and then abandoned. Pointedly <i>not</i> playable: a cancelled title stays in
    /// the calendar rather than appearing in Backlog, because moving it would claim it shipped
    /// and dropping it would lose the title. It is labelled rather than dated.
    /// </summary>
    Cancelled,

    /// <summary>
    /// Not announced by anybody who would know. Not playable, and <b>not on the calendar
    /// either</b> — which is where it parts company with <see cref="Cancelled"/> above.
    ///
    /// <para>
    /// The two are easily confused, because neither is arriving on the date it names. The
    /// difference is that a cancelled title was announced, so the calendar is where you learn
    /// it is dead, where a rumour was never announced at all: Half-Life 3 among the things that
    /// are coming makes the whole list mean less. A rumour stays in Backlog with the ordinary
    /// titles. See <see cref="ReleaseWindow.NotOutOn(System.DateOnly)"/>.
    /// </para>
    /// </summary>
    Rumored,

    /// <summary>Released and since withdrawn from sale. Still a thing you can have played.</summary>
    Delisted,
}
