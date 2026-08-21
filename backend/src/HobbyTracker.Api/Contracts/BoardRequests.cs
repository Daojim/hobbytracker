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
/// The full desired order of one board column, top first.
///
/// Sending the whole column rather than a move-plus-index is idempotent and immune to
/// off-by-one bugs, and at the size a personal backlog reaches the extra ids cost nothing.
/// </summary>
public sealed record ReorderRequest(
    [Required(AllowEmptyStrings = false)] string Hobby,
    LogStatus Status,
    [MinLength(1)] IReadOnlyList<int> MediaIds);
