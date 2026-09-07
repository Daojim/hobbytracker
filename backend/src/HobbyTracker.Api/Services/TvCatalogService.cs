using System.Globalization;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Tmdb;
using HobbyTracker.Api.Integrations.Tmdb.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HobbyTracker.Api.Services;

public interface ITvCatalogService
{
    Task<IReadOnlyList<TvShowDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken);

    Task<TvShowDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken);

    Task<TvShowDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken);

    /// <summary>
    /// Fills in everything only <c>/tv/{id}</c> knows. False means "not mine" — another hobby's
    /// title, or one entered by hand — rather than a failure.
    /// </summary>
    Task<bool> EnrichAsync(int mediaId, CancellationToken cancellationToken);

    Task<int> RefreshLibraryAsync(CancellationToken cancellationToken);
}

/// <summary>
/// TMDB into the database and back out as contracts, for shows.
///
/// <see cref="MovieCatalogService"/>'s shape, including its <c>23505</c> recovery, because what
/// is being defended against is identical. Four things differ, and every one of them is a
/// difference between a show and a film rather than a second opinion about how to write this:
///
/// <list type="bullet">
/// <item>Everything filters on <see cref="SeedData.Sources.TmdbTv"/>. TMDB numbers films and
/// shows in separate sequences, so the source is half of what identifies a title.</item>
/// <item>Seasons are a child collection, replaced wholesale on every enrichment — which is why
/// the two queries that write them <see cref="Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.Include{TEntity,TProperty}(IQueryable{TEntity},System.Linq.Expressions.Expression{Func{TEntity,TProperty}})">Include</see>
/// them first.</item>
/// <item>The episode runtime has a fallback behind it, because TMDB drops
/// <c>episode_run_time</c> on newer shows.</item>
/// <item>There is a year span rather than a release year, and the far end of it is legitimately
/// absent while a show is still running.</item>
/// </list>
/// </summary>
public sealed class TvCatalogService(
    HobbyTrackerDbContext db,
    ITmdbClient tmdb,
    IOptions<TmdbOptions> options,
    ILogger<TvCatalogService> logger,
    ICurrentUser user) : ITvCatalogService
{
    /// <summary>
    /// How many titles one refresh will touch. One request per show, because TMDB has no
    /// batch-by-id endpoint — this bounds the work rather than the size of any one request.
    /// </summary>
    private const int RefreshCeiling = 5_000;

    public async Task<IReadOnlyList<TvShowDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken)
    {
        var wanted = limit ?? options.Value.DefaultSearchLimit;
        var found = await tmdb.SearchTvAsync(search, wanted, cancellationToken);

        if (found.Count == 0)
        {
            return [];
        }

        var stored = await UpsertAsync(found, cancellationToken);

        // TMDB's own order, kept, for the reason films keep it: its search is relevance-ranked
        // and prefix-matches mid-word, so there is nothing here for a re-rank to add.
        return
        [
            .. found
                .Select(result => stored.GetValueOrDefault(ExternalIdOf(result)))
                .Where(show => show is not null)
                .Select(show => TvShowDto.From(show!))
        ];
    }

    public async Task<TvShowDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken)
    {
        // Querying the derived DbSet is what makes this correct under TPT: it emits an INNER
        // JOIN of media and tv_shows, so a film is not found here rather than returned with
        // empty show fields.
        var show = await db.TvShows
            .AsNoTracking()
            .Include(candidate => candidate.Seasons)
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (show is null)
        {
            return null;
        }

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return TvShowDetailDto.From(show, [.. show.Seasons], entries);
    }

    public async Task<TvShowDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken)
    {
        var show = await db.TvShows
            .Include(candidate => candidate.Seasons)
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (show is null)
        {
            return null;
        }

        // Blank means "use the automatic pick", which is what null means in the column. An empty
        // string would be a third state nothing else in the app understands.
        show.PrimaryGenre = string.IsNullOrWhiteSpace(genre) ? null : genre.Trim();
        await db.SaveChangesAsync(cancellationToken);

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return TvShowDetailDto.From(show, [.. show.Seasons], entries);
    }

    public async Task<bool> EnrichAsync(int mediaId, CancellationToken cancellationToken)
    {
        // Include the seasons before touching them. ApplyDetail replaces the collection, and on
        // an unloaded one Clear() removes nothing while the adds go on to collide with
        // pk_tv_seasons. Measured, by deleting this line: it is a 23505 out of SaveChangesAsync,
        // which LogEntryService then logs and swallows — so the pass is written, the show stays
        // unenriched, and the only trace is a line in the log. The composite key is what makes
        // it that loud rather than silently doubling every season on every refresh.
        var show = await db.TvShows
            .Include(candidate => candidate.Seasons)
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        // Not a show, or hand-entered and so not TMDB's to describe. Every IMediaAdded handler
        // hears about every title and declines what is not its own; this is that decline.
        if (show?.ExternalId is null || !int.TryParse(show.ExternalId, out var tmdbId))
        {
            return false;
        }

        var detail = await tmdb.GetTvAsync(tmdbId, cancellationToken);

        if (detail is null)
        {
            // TMDB no longer knows the id. Keep what was last known rather than blanking a card
            // over somebody else's record going away.
            logger.LogInformation(
                "TMDB no longer knows show {TmdbId}; leaving media {MediaId} as it was.",
                tmdbId,
                mediaId);

            return false;
        }

        ApplyDetail(detail, show);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<int> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
        // Deliberately not scoped to the signed-in user: it selects on "anybody has logged this"
        // and writes only shared columns. Both other catalog services carry the same note,
        // because all three read like missed scoping sites and none of them is one.
        var ids = await db.TvShows
            .Where(show => show.SourceId == SeedData.Sources.TmdbTv
                           && show.ExternalId != null
                           && show.LogEntries.Any())
            .Select(show => show.Id)
            .Take(RefreshCeiling)
            .ToListAsync(cancellationToken);

        var refreshed = 0;

        foreach (var mediaId in ids)
        {
            // One request per title, because TMDB has no batch-by-id endpoint. One show failing
            // is not a reason to abandon the rest of somebody's library.
            try
            {
                if (await EnrichAsync(mediaId, cancellationToken))
                {
                    refreshed++;
                }
            }
            catch (TmdbException exception)
            {
                logger.LogWarning(
                    exception, "Refreshing media {MediaId} from TMDB failed; moving on.", mediaId);
            }
        }

        return refreshed;
    }

    /// <summary>
    /// A title's passes, newest first. The same order the board decides which pass is current
    /// by, and one of the places that all have to agree — see <b>Library is not the catalog</b>
    /// in <c>docs/board.md</c>. Count them rather than trusting a number written down anywhere.
    /// </summary>
    private IQueryable<LogEntry> EntriesFor(int mediaId)
    {
        var userId = user.Id;

        return db.LogEntries
            .Include(entry => entry.Media)
            .Include(entry => entry.Notes)
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id);
    }

    private async Task<Dictionary<string, TvShow>> UpsertAsync(
        IReadOnlyList<TmdbTvShow> results, CancellationToken cancellationToken)
    {
        // Two tracked entities sharing a key throw on save, so duplicates are collapsed before
        // they reach the change tracker.
        var incoming = results
            .Where(result => !string.IsNullOrWhiteSpace(result.Name))
            .GroupBy(result => result.Id)
            .Select(group => group.First())
            .ToList();

        var externalIds = incoming.Select(ExternalIdOf).ToList();

        var tracked = await db.TvShows
            .Where(show => show.SourceId == SeedData.Sources.TmdbTv
                           && externalIds.Contains(show.ExternalId!))
            .ToDictionaryAsync(show => show.ExternalId!, StringComparer.Ordinal, cancellationToken);

        foreach (var result in incoming)
        {
            var externalId = ExternalIdOf(result);

            if (!tracked.TryGetValue(externalId, out var show))
            {
                show = new TvShow
                {
                    HobbyId = SeedData.Hobbies.Tv,
                    SourceId = SeedData.Sources.TmdbTv,
                    ExternalId = externalId,
                    Title = result.Name!,
                };

                db.TvShows.Add(show);
                tracked[externalId] = show;
            }

            ApplySearchResult(result, show);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Another request inserted one of these titles between our read and our write. The
            // partial unique index turned what would have been a duplicate row into a 23505;
            // re-read whichever write won.
            logger.LogInformation(
                "Concurrent insert detected during TMDB show upsert; re-reading the winning rows.");

            db.ChangeTracker.Clear();

            return await db.TvShows
                .AsNoTracking()
                .Where(show => show.SourceId == SeedData.Sources.TmdbTv
                               && externalIds.Contains(show.ExternalId!))
                .ToDictionaryAsync(
                    show => show.ExternalId!, StringComparer.Ordinal, cancellationToken);
        }

        return tracked;
    }

    /// <summary>
    /// What a search knows: a name, a poster and a first air year. Pointedly not the counts, the
    /// creators, the status or the seasons — TMDB's search endpoint carries none of them, and
    /// writing empties over what <see cref="EnrichAsync"/> already fetched would undo it on the
    /// next search anybody typed.
    /// </summary>
    private void ApplySearchResult(TmdbTvShow source, TvShow target)
    {
        target.Title = source.Name!;
        target.CoverUrl = TmdbImage.PosterUrl(
            options.Value.ImageBaseUrl, options.Value.PosterSize, source.PosterPath);
        target.FirstAirYear = YearOf(source.FirstAirDate) ?? target.FirstAirYear;
    }

    /// <summary>
    /// The other half. <b>PrimaryGenre is never touched</b> — it is the one field on a show that
    /// is the user's rather than TMDB's, exactly as it is on a film and on a game, and a
    /// maintenance route nobody ran deliberately should not undo a decision somebody made.
    /// </summary>
    private void ApplyDetail(TmdbTvShowDetail source, TvShow target)
    {
        target.Title = source.Name ?? target.Title;
        target.FirstAirYear = YearOf(source.FirstAirDate) ?? target.FirstAirYear;

        // Not coalesced onto the old value, unlike the first year: a show that was Ended and is
        // now Returning genuinely loses its last air date, and keeping the stale one would print
        // a closed span over a show that is running again.
        target.LastAirYear = YearOf(source.LastAirDate);
        target.AirStatus = source.Status ?? target.AirStatus;

        target.NumberOfSeasons = source.NumberOfSeasons;
        target.NumberOfEpisodes = source.NumberOfEpisodes;
        target.EpisodeRuntimeMinutes = EpisodeRuntimeOf(source);

        if (source.PosterPath is not null)
        {
            target.CoverUrl = TmdbImage.PosterUrl(
                options.Value.ImageBaseUrl, options.Value.PosterSize, source.PosterPath);
        }

        // Kept in TMDB's order, which is roughly how prominent each is for the show. Which one a
        // card is painted as is settled on the client, where the ordering and the palette are
        // the same list.
        target.Genres = [.. (source.Genres ?? []).Select(genre => genre.Name).OfType<string>()];

        // No filtering on a job, unlike a film's directors: created_by is already only the
        // creators, which is the one place a show's detail call is simpler than a film's.
        target.Creators = [.. (source.CreatedBy ?? []).Select(creator => creator.Name).OfType<string>()];

        // Replaced wholesale rather than merged. A show can be re-cut upstream — seasons split,
        // renumbered, or withdrawn — and reconciling that against what is stored would be
        // guessing which of two disagreeing lists is right. TMDB's is, so the stored one goes.
        target.Seasons.Clear();

        foreach (var season in source.Seasons ?? [])
        {
            target.Seasons.Add(new TvSeason
            {
                SeasonNumber = season.SeasonNumber,
                EpisodeCount = season.EpisodeCount,
                Name = season.Name,
            });
        }
    }

    /// <summary>
    /// How long an episode runs, and the fallback is the normal path rather than a corner.
    ///
    /// TMDB has been dropping <c>episode_run_time</c> on newer entries, so anything recent
    /// arrives with an empty array and its only runtime on the last episode that aired. Nought
    /// means "nobody has filled this in" at either door, and null is what says that truthfully —
    /// <c>ck_tv_shows_episode_runtime_positive</c> would refuse it and turn an add into a 500.
    /// </summary>
    private static int? EpisodeRuntimeOf(TmdbTvShowDetail source)
    {
        var stated = (source.EpisodeRunTime ?? []).FirstOrDefault(minutes => minutes > 0);

        if (stated > 0)
        {
            return stated;
        }

        return source.LastEpisodeToAir?.Runtime is > 0 ? source.LastEpisodeToAir.Runtime : null;
    }

    /// <summary>
    /// The year out of <c>YYYY-MM-DD</c>, and nothing more.
    ///
    /// Not run through the journal clock: an air year is a fact about the show rather than a
    /// moment in anybody's day, and localising a date TMDB states without a timezone would
    /// invent a distinction it cannot carry. See <c>docs/data-model.md</c>.
    /// </summary>
    private static int? YearOf(string? date) =>
        date is { Length: >= 4 } && int.TryParse(date[..4], out var year) ? year : null;

    private static string ExternalIdOf(TmdbTvShow result) =>
        result.Id.ToString(CultureInfo.InvariantCulture);

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
