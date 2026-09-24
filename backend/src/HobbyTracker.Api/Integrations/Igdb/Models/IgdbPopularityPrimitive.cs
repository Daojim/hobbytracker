namespace HobbyTracker.Api.Integrations.Igdb.Models;

/// <summary>
/// One row of a PopScore list, from <c>/v4/popularity_primitives</c>: a game's place on one kind
/// of popularity, and nothing about the game itself — which is why reading a list takes a second
/// question to <c>/games</c>.
///
/// Only the id is asked for. The list is sorted by its <c>value</c> in the query, and the value
/// itself is a share of whatever the list counts rather than a count (the Playing list's leader
/// scored 0.009 on 23 September 2026), so it means nothing outside the order it gives.
/// </summary>
public sealed class IgdbPopularityPrimitive
{
    public int GameId { get; set; }
}
