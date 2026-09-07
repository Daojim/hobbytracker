using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;

namespace HobbyTracker.Api.Services;

/// <summary>
/// A show reaching the board fetches the half of itself a search could not carry.
///
/// <see cref="TmdbOnMediaAdded"/>'s twin, and synchronous for the same reason: TMDB is a
/// documented API answering one fast request, where HowLongToBeat is a scrape behind a
/// politeness floor. A show's card is complete the moment it lands.
///
/// It matters more here than it does for a film. A show's seasons arrive on this call, and the
/// journal's episode dropdown is built from them — so a show added without this having run has
/// no season list to offer, and the control would be empty on a title the board is happily
/// displaying.
///
/// Failing is still not allowed to take the write with it: <see cref="LogEntryService"/> logs
/// and swallows, and the show is left for <c>POST /api/tv/refresh</c>.
/// </summary>
public sealed class TvOnMediaAdded(ITvCatalogService shows) : IMediaAdded
{
    public async Task OnAddedAsync(Media media, CancellationToken cancellationToken)
    {
        // Declined by hobby *and by source*, before a query. The hobby check is what the other
        // handlers do; the source check is what keeps a second provider additive.
        //
        // If TMDB's runtimes ever disappoint and TVmaze lands beside it, a TVmaze show would be
        // hobby=tv with an external id from a different numbering. Without this clause it would
        // be handed to TMDB's enricher, which would cheerfully answer about whichever show
        // happens to hold that id at TMDB and overwrite the row with it. Silent corruption, and
        // one line to prevent today rather than a debugging session later.
        if (media.HobbyId != SeedData.Hobbies.Tv || media.SourceId != SeedData.Sources.TmdbTv)
        {
            return;
        }

        await shows.EnrichAsync(media.Id, cancellationToken);
    }
}
