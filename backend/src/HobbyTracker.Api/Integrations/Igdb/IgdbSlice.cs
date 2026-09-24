using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Integrations.Igdb;

/// <summary>
/// Part of one of IGDB's orderings — a Discover list from some place on — and the games in it,
/// each with the place it holds.
///
/// <para>
/// <b>Places rather than positions, because a slice can have holes.</b> PopScore ranks games that
/// the question describing them then declines — a bundle, a title the Discover filter keeps off —
/// so the fourth game back can stand fifth. The page after this one starts at a place, and
/// counting what came back instead would start it early and show a title twice.
/// </para>
/// </summary>
/// <param name="Games">In the ordering's order, each with its place, counted from nought.</param>
/// <param name="Ended">
/// Whether the ordering ran out inside the slice: IGDB had fewer places than were asked about, so
/// nothing lies past them. When it did not, there may be more.
/// </param>
public sealed record IgdbSlice(IReadOnlyList<IgdbRanked> Games, bool Ended);

/// <summary>One game in an <see cref="IgdbSlice"/>, and its place in the ordering.</summary>
public sealed record IgdbRanked(int Place, IgdbGame Game);
