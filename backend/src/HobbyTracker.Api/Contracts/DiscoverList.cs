namespace HobbyTracker.Api.Contracts;

/// <summary>
/// The Discover page's lists: what a provider would show somebody who has not typed anything.
///
/// The words each one wears live with the hobby in <c>frontend/src/hobbies/</c>, and only the slug
/// is shared. Four are questions for the provider that answer the same for everybody;
/// <see cref="FromYourRatings"/> is the one made from your own board.
/// </summary>
public enum DiscoverList
{
    NewReleases,
    PopularNow,
    MostAnticipated,
    MostPlayed,

    /// <summary>
    /// What the provider calls like the games you finished and rated 8 or more, less what is on
    /// your board. Added on 7 November 2026 (#17), and the first list that reads a board.
    /// </summary>
    FromYourRatings,
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
        ["from-your-ratings"] = DiscoverList.FromYourRatings,
    };

    /// <summary>The list a slug names, or false for a slug that names nothing.</summary>
    public static bool TryParse(string slug, out DiscoverList list) =>
        BySlug.TryGetValue(slug, out list);
}
