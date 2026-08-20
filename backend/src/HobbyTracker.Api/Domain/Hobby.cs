namespace HobbyTracker.Api.Domain;

/// <summary>
/// Lookup of hobby categories: games, movies, tv, anime, books, music.
/// A closed taxonomy the app owns — rows are seeded by migration, never written at runtime.
/// </summary>
public class Hobby
{
    public int Id { get; set; }

    /// <summary>Stable lowercase slug, e.g. "games".</summary>
    public required string Name { get; set; }

    public ICollection<Media> Media { get; set; } = [];
}
