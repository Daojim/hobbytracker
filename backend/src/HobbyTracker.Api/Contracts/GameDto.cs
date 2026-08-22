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
    decimal? HltbMainStoryHours)
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
        game.HltbMainStoryHours);
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
