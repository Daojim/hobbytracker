namespace HobbyTracker.Api.Integrations.Tmdb;

/// <summary>
/// Builds TMDB poster URLs from the path half TMDB returns.
///
/// The same shape as <c>IgdbImage</c>, and for the same reason: TMDB serves one asset at many
/// widths and the width sits in the path, so what gets stored is composed rather than echoed.
/// A `poster_path` on its own is useless to a browser and a whole URL would bake today's size
/// choice into the database.
///
/// The base and the size are settings rather than constants here, because TMDB publishes both
/// from `/configuration` and reserves the right to move them. Pinning them means one config
/// change rather than a release if that ever happens — the reasoning `Igdb:BaseUrl` already has.
/// </summary>
public static class TmdbImage
{
    /// <summary>
    /// Null in, null out — a film with no poster is ordinary, and the card has a placeholder
    /// for exactly that.
    /// </summary>
    public static string? PosterUrl(string baseUrl, string size, string? posterPath) =>
        string.IsNullOrWhiteSpace(posterPath)
            ? null
            : $"{baseUrl.TrimEnd('/')}/{size}{posterPath}";
}
