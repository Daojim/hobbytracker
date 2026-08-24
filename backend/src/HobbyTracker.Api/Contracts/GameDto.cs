using System.ComponentModel.DataAnnotations;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Contracts;

/// <summary>
/// What the API returns for a game.
///
/// Deliberately not the EF entity: serialising <see cref="Game"/> directly would drag its
/// navigation properties into the response shape and weld the wire format to the schema, so
/// that a column rename becomes a breaking API change. The mapping here is the seam that
/// keeps those two free to move independently.
/// </summary>
public sealed record GameDto(
    int Id,
    string Title,
    string? CoverUrl,
    IReadOnlyList<string> Platforms,
    IReadOnlyList<string> Developers,
    IReadOnlyList<string> Genres,

    /// <summary>The chosen primary genre, or null to use the automatic pick.</summary>
    string? PrimaryGenre,
    string? ExternalId,
    string Source,

    /// <summary>
    /// HowLongToBeat's three completion times, in hours. Any of them can be null on its own —
    /// a game with a main-story time and no completionist time is ordinary, not an error.
    /// </summary>
    decimal? HltbAllStylesHours,
    decimal? HltbMainStoryHours,
    decimal? HltbMainExtraHours,
    decimal? HltbCompletionistHours)
{
    public static GameDto From(Game game) => new(
        game.Id,
        game.Title,
        game.CoverUrl,
        game.Platforms,
        game.Developers,
        game.Genres,
        game.PrimaryGenre,
        game.ExternalId,
        SeedData.Sources.NameFor(game.SourceId),
        game.HltbAllStylesHours,
        game.HltbMainStoryHours,
        game.HltbMainExtraHours,
        game.HltbCompletionistHours);
}

/// <summary>
/// Which genre stands for a game on the board.
///
/// Free text up to 50 characters rather than one of the game's own genres. IGDB's vocabulary is
/// theirs to change, and a value that was true when it was chosen has to outlive the list it was
/// chosen from — the same reasoning that keeps log_entries.platform free text. Null puts the
/// game back on the automatic pick.
/// </summary>
public sealed record SetGenreRequest([MaxLength(50)] string? Genre);

/// <summary>How many titles a refresh brought up to date.</summary>
public sealed record RefreshResult(int Refreshed);

/// <summary>
/// How many titles were put in the queue — pointedly not how many changed.
///
/// A separate type from <see cref="RefreshResult"/> rather than a reuse of it, because the two
/// numbers mean different things and sharing a name for them is how that stops being noticed:
/// Refreshed counts rows the IGDB upsert touched, where this counts work not yet begun. The
/// HowLongToBeat backfill cannot report the other number, since at a floor of seconds between
/// requests the answers arrive long after the reply has gone.
/// </summary>
public sealed record QueuedResult(int Queued);

/// <summary>
/// The HowLongToBeat id to pin to a title by hand, or null to take the pin back.
///
/// The only correction this feature offers, and enough for both ways of being wrong: a match
/// that found the wrong game and one that found nothing are both fixed by naming the right id.
/// Unlike typed-in hours it also survives the next backfill, since a stored id is what every
/// later refresh fetches rather than re-matching.
/// </summary>
public sealed record SetHltbIdRequest([Range(1, int.MaxValue)] int? HltbId);
