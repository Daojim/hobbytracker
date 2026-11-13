namespace HobbyTracker.Api.Contracts;

/// <summary>
/// A game you hid from Discover, as the list of them draws it: a cover and a name a row, the
/// newest hide first, and the media id <i>Show again</i> sends back.
/// </summary>
/// <param name="MediaId">The title's media id, as a Discover tile carries it.</param>
/// <param name="Title">The name its tile leads with.</param>
public sealed record HiddenTitleDto(int MediaId, string Title, string? CoverUrl);
