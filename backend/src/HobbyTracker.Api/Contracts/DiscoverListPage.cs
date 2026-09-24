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
public sealed record DiscoverListPage<T>(IReadOnlyList<T> Titles, int? Next);
