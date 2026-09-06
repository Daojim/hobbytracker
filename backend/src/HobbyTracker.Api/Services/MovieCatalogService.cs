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

public interface IMovieCatalogService
{
    Task<IReadOnlyList<MovieDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken);

    /// <summary>One stored film plus your passes against it. Null when it is not a film.</summary>
    Task<MovieDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken);

    Task<MovieDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken);

    /// <summary>
    /// Fetches the half of a film a search does not carry — runtime, named genres, the director.
    /// False when the id is not a film, which is how it declines a game.
    /// </summary>
    Task<bool> EnrichAsync(int mediaId, CancellationToken cancellationToken);

    /// <summary>Re-fetches every TMDB title on somebody's board. Returns how many changed.</summary>
    Task<int> RefreshLibraryAsync(CancellationToken cancellationToken);
}

/// <summary>
/// TMDB into the database, and back out as contracts.
///
/// <c>GameCatalogService</c>'s shape, including the upsert and its 23505 recovery, because what
/// is being defended against is identical: two identical searches racing each other into the
/// partial unique index on <c>(source_id, external_id)</c>.
///
/// <b>The one real difference is that a film takes two requests where a game takes one.</b>
/// <c>/search/movie</c> carries no runtime and names no genre, so a search stores what a search
/// knows and <see cref="EnrichAsync"/> fills in the rest when a title reaches somebody's board.
/// That is not a queue: TMDB is a documented API answering in one fast request, where
/// HowLongToBeat is a scrape behind a politeness floor measured in seconds. See
/// <c>docs/movies-tmdb.md</c>.
/// </summary>
public sealed class MovieCatalogService(
    HobbyTrackerDbContext db,
    ITmdbClient tmdb,
    IOptions<TmdbOptions> options,
    ILogger<MovieCatalogService> logger,
    ICurrentUser user) : IMovieCatalogService
{
    /// <summary>
    /// How many titles one refresh pass will touch. TMDB has no batch-by-id endpoint — unlike
    /// IGDB's <c>where id = (…)</c> batched at 500, this is one request per film — so the number
    /// bounds the work rather than the size of a request.
    /// </summary>
    private const int RefreshCeiling = 5_000;

    public async Task<IReadOnlyList<MovieDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken)
    {
        var wanted = limit ?? options.Value.DefaultSearchLimit;
        var found = await tmdb.SearchMoviesAsync(search, wanted, cancellationToken);

        if (found.Count == 0)
        {
            return [];
        }

        var stored = await UpsertAsync(found, cancellationToken);

        // TMDB's own order, kept. Its search is relevance-ranked already and nothing here has
        // measured a reason to disagree — where IGDB's needed re-ranking because string
        // relevance cannot tell a game from a fan game named after it. See docs/movies-tmdb.md.
        return
        [
            .. found
                .Select(result => stored.GetValueOrDefault(ExternalIdOf(result)))
                .Where(movie => movie is not null)
                .Select(movie => MovieDto.From(movie!))
        ];
    }

    public async Task<MovieDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken)
    {
        // Querying the derived DbSet is what makes this correct under TPT: it emits an INNER
        // JOIN of media and movies, so a game is not found here rather than returned with empty
        // film fields.
        var movie = await db.Movies
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (movie is null)
        {
            return null;
        }

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return MovieDetailDto.From(movie, entries);
    }

    public async Task<MovieDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken)
    {
        var movie = await db.Movies
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (movie is null)
        {
            return null;
        }

        // Blank means "use the automatic pick", which is what null means in the column. An empty
        // string would be a third state nothing else in the app understands.
        movie.PrimaryGenre = string.IsNullOrWhiteSpace(genre) ? null : genre.Trim();
        await db.SaveChangesAsync(cancellationToken);

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return MovieDetailDto.From(movie, entries);
    }

    public async Task<bool> EnrichAsync(int mediaId, CancellationToken cancellationToken)
    {
        var movie = await db.Movies
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        // Not a film, or hand-entered and so not TMDB's to describe. Every IMediaAdded handler
        // hears about every title and declines what is not its own; this is that decline, one
        // step later than HltbOnMediaAdded's, which answers from the hobby id alone.
        if (movie?.ExternalId is null || !int.TryParse(movie.ExternalId, out var tmdbId))
        {
            return false;
        }

        var detail = await tmdb.GetMovieAsync(tmdbId, cancellationToken);

        if (detail is null)
        {
            // TMDB no longer knows the id. Keep what was last known rather than blanking a card
            // over somebody else's record going away.
            logger.LogInformation(
                "TMDB no longer knows film {TmdbId}; leaving media {MediaId} as it was.",
                tmdbId,
                mediaId);

            return false;
        }

        ApplyDetail(detail, movie);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<int> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
        // Deliberately not scoped to the signed-in user: it selects on "anybody has logged this"
        // and writes only shared columns. GameCatalogService.RefreshLibraryAsync carries the
        // same note, because both read like missed scoping sites and neither is one.
        var ids = await db.Movies
            .Where(movie => movie.SourceId == SeedData.Sources.Tmdb
                            && movie.ExternalId != null
                            && movie.LogEntries.Any())
            .Select(movie => movie.Id)
            .Take(RefreshCeiling)
            .ToListAsync(cancellationToken);

        var refreshed = 0;

        foreach (var mediaId in ids)
        {
            // One request per title, because TMDB has no batch-by-id endpoint. One film failing
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
    /// in <c>docs/board.md</c>.
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

    private async Task<Dictionary<string, Movie>> UpsertAsync(
        IReadOnlyList<TmdbMovie> results, CancellationToken cancellationToken)
    {
        // Two tracked entities sharing a key throw on save, so duplicates are collapsed before
        // they reach the change tracker.
        var incoming = results
            .Where(result => !string.IsNullOrWhiteSpace(result.Title))
            .GroupBy(result => result.Id)
            .Select(group => group.First())
            .ToList();

        var externalIds = incoming.Select(ExternalIdOf).ToList();

        var tracked = await db.Movies
            .Where(movie => movie.SourceId == SeedData.Sources.Tmdb
                            && externalIds.Contains(movie.ExternalId!))
            .ToDictionaryAsync(movie => movie.ExternalId!, StringComparer.Ordinal, cancellationToken);

        foreach (var result in incoming)
        {
            var externalId = ExternalIdOf(result);

            if (!tracked.TryGetValue(externalId, out var movie))
            {
                movie = new Movie
                {
                    HobbyId = SeedData.Hobbies.Movies,
                    SourceId = SeedData.Sources.Tmdb,
                    ExternalId = externalId,
                    Title = result.Title!,
                };

                db.Movies.Add(movie);
                tracked[externalId] = movie;
            }

            ApplySearchResult(result, movie);
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
                "Concurrent insert detected during TMDB upsert; re-reading the winning rows.");

            db.ChangeTracker.Clear();

            return await db.Movies
                .AsNoTracking()
                .Where(movie => movie.SourceId == SeedData.Sources.Tmdb
                                && externalIds.Contains(movie.ExternalId!))
                .ToDictionaryAsync(
                    movie => movie.ExternalId!, StringComparer.Ordinal, cancellationToken);
        }

        return tracked;
    }

    /// <summary>
    /// What a search knows: a title, a poster and a year. Pointedly not runtime, genres or the
    /// director — TMDB's search endpoint carries none of them, and writing empties over what
    /// <see cref="EnrichAsync"/> already fetched would undo it on the next search anybody typed.
    /// </summary>
    private void ApplySearchResult(TmdbMovie source, Movie target)
    {
        target.Title = source.Title!;
        target.CoverUrl = TmdbImage.PosterUrl(
            options.Value.ImageBaseUrl, options.Value.PosterSize, source.PosterPath);
        target.ReleaseYear = YearOf(source.ReleaseDate) ?? target.ReleaseYear;
    }

    /// <summary>
    /// The other half. <b>PrimaryGenre is never touched</b> — it is the one field on a film that
    /// is the user's rather than TMDB's, exactly as it is on a game, and a maintenance route
    /// nobody ran deliberately should not undo a decision somebody made on purpose.
    /// </summary>
    private void ApplyDetail(TmdbMovieDetail source, Movie target)
    {
        target.Title = source.Title ?? target.Title;
        target.ReleaseYear = YearOf(source.ReleaseDate) ?? target.ReleaseYear;

        if (source.PosterPath is not null)
        {
            target.CoverUrl = TmdbImage.PosterUrl(
                options.Value.ImageBaseUrl, options.Value.PosterSize, source.PosterPath);
        }

        // 0 means "nobody has filled this in", which is not a runtime. The check constraint
        // would refuse it, so mapping it through would turn an add into a 500 — and null already
        // says the true thing.
        target.RuntimeMinutes = source.Runtime is > 0 ? source.Runtime : null;

        // Kept in TMDB's order, which is roughly how prominent each is for the film. Which one a
        // card is painted as is settled on the client, where the ordering and the palette are
        // the same list.
        target.Genres = [.. (source.Genres ?? []).Select(genre => genre.Name).OfType<string>()];

        // Filtered on the job rather than taken off the front: a real crew list runs to dozens
        // and the director is nowhere near the top of it.
        target.Directors =
        [
            .. (source.Credits?.Crew ?? [])
                .Where(member => string.Equals(member.Job, "Director", StringComparison.Ordinal))
                .Select(member => member.Name)
                .OfType<string>()
        ];
    }

    /// <summary>
    /// The year out of <c>YYYY-MM-DD</c>, and nothing more.
    ///
    /// Not run through the journal clock: a release year is a fact about the film rather than a
    /// moment in anybody's day, and localising a date TMDB states without a timezone would
    /// invent a distinction it cannot carry. The same reasoning holds a game's release_year in
    /// UTC — see <c>docs/data-model.md</c>.
    /// </summary>
    private static int? YearOf(string? releaseDate) =>
        releaseDate is { Length: >= 4 } && int.TryParse(releaseDate[..4], out var year)
            ? year
            : null;

    private static string ExternalIdOf(TmdbMovie result) =>
        result.Id.ToString(CultureInfo.InvariantCulture);

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
