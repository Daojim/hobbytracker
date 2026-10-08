using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Moving a title to a board column. The caller names the target column — the server decides
/// whether that edits the current entry or starts a new one, and works out the dates, so no
/// client has to know which entry is current.
///
/// <para>
/// <b><paramref name="NotFinished"/> is the one thing more a caller can say</b>, and only about a
/// finished pass: the finish never happened. Leaving Completed then moves that pass rather than
/// starting a new one beside it, and takes its finish date away. Without it, leaving Completed is
/// a replay, as it always was. It means nothing to a pass that is not finished.
/// </para>
/// </summary>
public sealed record StatusTransitionRequest(LogStatus Status, bool NotFinished = false);

/// <summary>
/// Putting a title on your board, in a column. The caller names the column and nothing else,
/// exactly as a move does: the dates the first pass carries are worked out by the rule a drag
/// into that column follows, so a client cannot add something to Playing with no start.
///
/// Any of the five columns. Which ones a tile offers is the client's decision, not the API's.
/// </summary>
public sealed record AddToBoardRequest(LogStatus Status);

/// <summary>
/// The full desired order of one board column, top first.
///
/// Sending the whole column rather than a move-plus-index is idempotent and immune to
/// off-by-one bugs, and at the size a personal backlog reaches the extra ids cost nothing.
/// </summary>
public sealed record ReorderRequest(
    [Required(AllowEmptyStrings = false)] string Hobby,
    LogStatus Status,
    [MinLength(1)] IReadOnlyList<int> MediaIds);
