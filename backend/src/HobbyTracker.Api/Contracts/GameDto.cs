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
        game.ExternalId,
        SeedData.Sources.NameFor(game.SourceId),
        game.HltbMainStoryHours);
}
