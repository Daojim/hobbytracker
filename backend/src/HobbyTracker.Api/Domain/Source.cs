namespace HobbyTracker.Api.Domain;

/// <summary>
/// Where a <see cref="Media"/> row's metadata came from — "igdb", later "tmdb"/"mal", or
/// "manual" for titles typed in by hand when no API carries them.
/// </summary>
public class Source
{
    public int Id { get; set; }

    /// <summary>Stable lowercase slug, e.g. "igdb".</summary>
    public required string Name { get; set; }

    /// <summary>API root for this source. Null for "manual" — there is no API behind it.</summary>
    public string? BaseUrl { get; set; }

    public ICollection<Media> Media { get; set; } = [];
}
