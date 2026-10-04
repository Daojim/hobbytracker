namespace HobbyTracker.Api.Contracts;

/// <summary>
/// What deleting your account would take with it, as the warning in Settings says it.
///
/// Facts rather than a sentence, for Stats' reason: what a hobby calls its titles — games,
/// films, shows — already has a home in <c>frontend/src/hobbies/</c>, and a second copy here
/// could disagree with the board.
/// </summary>
/// <param name="SignedInWith">
/// The providers this account signs in with, in the order they were linked. The warning names
/// them because the same person at Google and at Discord is two accounts, and this is the only
/// thing that tells the two apart.
/// </param>
/// <param name="Boards">
/// Every board with anything on it, in <c>hobby_lu</c>'s order, which is the nav's. A board
/// with nothing on it is left out rather than sent as nought.
/// </param>
/// <param name="Notes">Every note on every board.</param>
public sealed record AccountDto(
    IReadOnlyList<string> SignedInWith,
    IReadOnlyList<BoardTitlesDto> Boards,
    int Notes);

/// <summary>
/// How many titles one board holds: every title with a pass of yours on it, however many
/// passes, which is what the board itself shows. The calendar's titles count, because they are
/// Backlog entries.
/// </summary>
public sealed record BoardTitlesDto(string Hobby, int Titles);
