namespace HobbyTracker.Api.Contracts;

/// <summary>
/// The Discover page's lists: what a provider would show somebody who has not typed anything.
///
/// Each is a question for the provider rather than a view of anybody's board, so the words each
/// one wears live with the hobby in <c>frontend/src/hobbies/</c>, and only the slug is shared.
/// </summary>
public enum DiscoverList
{
    NewReleases,
    PopularNow,
    MostAnticipated,
    MostPlayed,
}

/// <summary>
/// The name each list has in an address.
///
/// Slugs rather than the enum's own names, because a person sees them: the page's tabs are links,
/// and <c>/board/games/discover/most-anticipated</c> is what the address bar says. Matched exactly,
/// so there is one spelling of each and the frontend's tabs are what writes it.
/// </summary>
public static class DiscoverLists
{
    private static readonly Dictionary<string, DiscoverList> BySlug = new(StringComparer.Ordinal)
    {
        ["new-releases"] = DiscoverList.NewReleases,
        ["popular-now"] = DiscoverList.PopularNow,
        ["most-anticipated"] = DiscoverList.MostAnticipated,
        ["most-played"] = DiscoverList.MostPlayed,
    };

    /// <summary>The list a slug names, or false for a slug that names nothing.</summary>
    public static bool TryParse(string slug, out DiscoverList list) =>
        BySlug.TryGetValue(slug, out list);
}
