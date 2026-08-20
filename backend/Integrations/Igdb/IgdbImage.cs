namespace HobbyTracker.Api.Integrations.Igdb;

/// <summary>
/// Builds IGDB image URLs from an image id.
///
/// IGDB serves the same asset at many sizes, and the size token sits in the path. That is why
/// the client requests <c>cover.image_id</c> rather than <c>cover.url</c>: the id is stable
/// and size-agnostic, so the stored value stays useful even if the front end later wants a
/// different size, whereas a stored url would bake today's choice into the database.
/// </summary>
public static class IgdbImage
{
    private const string Root = "https://images.igdb.com/igdb/image/upload";

    /// <summary>t_cover_big is 264×374 — the size a grid of box art actually wants.</summary>
    public static string? CoverUrl(string? imageId) =>
        string.IsNullOrWhiteSpace(imageId) ? null : $"{Root}/t_cover_big/{imageId}.jpg";
}
