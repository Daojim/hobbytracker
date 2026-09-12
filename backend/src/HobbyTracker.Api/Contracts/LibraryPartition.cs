namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Which side of the released/not-released line a board read wants.
///
/// The Backlog column and the release calendar are the same rows read two ways, so this is one
/// parameter rather than two endpoints with two projections: <c>ListAsync</c> and
/// <c>ItemAsync</c> already have to stay identical field for field, and a third copy of them is
/// how that stops being true.
///
/// Deliberately <b>not</b> a <see cref="LibrarySort"/> member, though the calendar does imply an
/// ordering. That enum is mirrored by hand in <c>frontend/src/api/types.ts</c> and offered by the
/// per-column sort control, so a value that means something in one place and nothing in four
/// would be a control the board has to hide — which is a branch.
///
/// It means nothing except on the Backlog column. Every other column carries titles you have
/// already started, and whether those are out is not a question worth asking.
/// </summary>
public enum LibraryPartition
{
    /// <summary>
    /// The board. Backlog answers with what you could play now, which includes every title
    /// nobody has asked a provider about.
    /// </summary>
    Default,

    /// <summary>
    /// The calendar under the board: the exact complement of what <see cref="Default"/> leaves
    /// out of Backlog. Exact matters — a title that fell into both, or into neither, is the
    /// failure this pairing exists to make impossible.
    /// </summary>
    Upcoming,
}
