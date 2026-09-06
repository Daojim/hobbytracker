using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Services;

/// <summary>
/// A film reaching the board fetches the half of itself a search could not carry.
///
/// TMDB's <c>/search/movie</c> has no runtime and names no genre, so a card added from a search
/// would have neither a stripe nor a length until something asked. This is what asks.
///
/// <b>Synchronously, and that is the deliberate contrast with HowLongToBeat.</b> HLTB queues
/// because reaching it needs a handshake behind a politeness floor measured in seconds, against
/// a site with no obligation to answer at all; TMDB is a documented API answering one fast
/// request. A queue here would be ceremony — and the payoff is that a film's card is complete
/// the moment it lands, so none of <c>HltbPending</c>'s polling apparatus applies to it.
///
/// Failing is still not allowed to take the write with it: <see cref="LogEntryService"/> logs
/// and swallows, and the film is left for <c>POST /api/movies/refresh</c>.
/// </summary>
public sealed class TmdbOnMediaAdded(IMovieCatalogService movies) : IMediaAdded
{
    public async Task OnAddedAsync(Media media, CancellationToken cancellationToken)
    {
        // Declined by hobby before a query, as HltbOnMediaAdded does. EnrichAsync would decline
        // a game anyway by finding no row, but it would spend a database round trip learning it.
        if (media.HobbyId != Data.SeedData.Hobbies.Movies)
        {
            return;
        }

        await movies.EnrichAsync(media.Id, cancellationToken);
    }
}
