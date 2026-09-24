using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// Moving a title to a board column. The caller names the target column and nothing else —
/// the server decides whether that edits the current entry or starts a new one, and works out
/// the dates, so no client has to know which entry is current.
/// </summary>
public sealed record StatusTransitionRequest(LogStatus Status);

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
