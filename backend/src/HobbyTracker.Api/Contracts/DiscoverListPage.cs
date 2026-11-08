namespace HobbyTracker.Api.Contracts;

/// <summary>
/// One page of a Discover list, and where the next one starts.
///
/// <para>
/// <b>Not a <see cref="PagedResult{T}"/>, and the two differences are the point.</b> A page number
/// can only find its page by multiplying, and two of the lists drop titles after IGDB has answered
/// — Popular now when the question describing PopScore's ranking declines a game, Most anticipated
/// when the calendar's rule does — so page two does not start at the 49th place. The server says
/// where it stopped instead, and the client hands that back. And there is no total, because
/// knowing it would cost IGDB another question for a number nobody reads.
/// </para>
/// </summary>
/// <param name="Titles">The page, in the list's order.</param>
/// <param name="Next">
/// The place the next page starts at, sent back as <c>from</c>; null when the list has run out.
/// </param>
/// <param name="Seeds">
/// How many of your titles a list made from your board starts from: for From your ratings, every
/// title whose latest finish you rated 8 or more. <b>Nought is why such a list is empty</b>, which the
/// page says in words of its own, where a list with seeds and nothing left to offer is empty for a
/// reason it says nothing special about. Null on the four lists that are the same for everybody.
/// </param>
/// <param name="Because">
/// Why each title is on a list made from your board: for each title's media id, the titles of yours
/// that point at it, highest rated first and then by name. A map beside the titles rather than a
/// field on each, because a title is the same <c>GameDto</c> every list and every search answers
/// with, and why it is on <i>your</i> list is a fact about the list. Null on the other four.
/// </param>
public sealed record DiscoverListPage<T>(
    IReadOnlyList<T> Titles,
    int? Next,
    int? Seeds = null,
    IReadOnlyDictionary<int, IReadOnlyList<RatedTitle>>? Because = null);

/// <summary>
/// One of your titles, and what you rated it: what a tile on From your ratings names, as in
/// <i>Because you rated Hollow Knight 9.5</i>. Its latest finish's rating, which is the one that
/// made it a seed.
/// </summary>
/// <param name="Title">The name its card leads with.</param>
public sealed record RatedTitle(string Title, decimal Rating);
