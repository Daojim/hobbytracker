namespace HobbyTracker.Api.Integrations.Tmdb.Models;

/// <summary>
/// A film as `/search/movie` describes one.
///
/// Deliberately thin, because the search endpoint is: no runtime, and genres only as ids. What a
/// card needs beyond this arrives from <see cref="TmdbMovieDetail"/> when the title is added.
///
/// These types never leave <c>Integrations/Tmdb</c> — the layering rule that keeps IGDB's wire
/// shapes out of the services applies here for the same reason.
/// </summary>
public sealed class TmdbMovie
{
    public int Id { get; init; }
    public string? Title { get; init; }

    /// <summary>
    /// `YYYY-MM-DD`, or empty for a film with no announced date. Read for its year and nothing
    /// else, so it stays a string rather than becoming a date nobody asked for.
    /// </summary>
    public string? ReleaseDate { get; init; }

    /// <summary>The path half of a poster URL. <see cref="TmdbImage"/> makes it whole.</summary>
    public string? PosterPath { get; init; }

    /// <summary>
    /// Genre ids, which are not names. The detail call spells them out, which is why nothing
    /// here maps them: an id would have to be resolved against a list that is itself
    /// language-dependent, and that is two ways to be wrong instead of none.
    /// </summary>
    public List<int>? GenreIds { get; init; }

    /// <summary>How many people have rated it. Ranking material, never stored.</summary>
    public int? VoteCount { get; init; }

    public double? Popularity { get; init; }
}
