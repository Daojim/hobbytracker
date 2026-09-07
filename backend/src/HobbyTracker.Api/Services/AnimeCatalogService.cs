using System.Globalization;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Mal;
using HobbyTracker.Api.Integrations.Mal.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HobbyTracker.Api.Services;

public interface IAnimeCatalogService
{
    Task<IReadOnlyList<AnimeDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken);

    Task<AnimeDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken);

    Task<AnimeDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken);

    Task<int> RefreshLibraryAsync(CancellationToken cancellationToken);
}

/// <summary>
/// MAL into the database and back out as contracts.
///
/// <see cref="TvCatalogService"/>'s shape, including its <c>23505</c> recovery, because what is
/// being defended against is identical. Three things differ, and every one of them is a
/// difference between MAL and TMDB rather than a second opinion about how to write this:
///
/// <list type="bullet">
/// <item><b>A search fills every column, so there is no enrichment step and no
/// <see cref="IMediaAdded"/> handler.</b> MAL's search and detail endpoints take the same
/// `fields` and answer with the same node, where TMDB's `/search/*` carries neither runtimes
/// nor genre names. A card here is complete the moment it is found, not the moment it is
/// added.</item>
/// <item><b>The results are re-ranked.</b> MAL's own order puts <i>2nd Season</i> above season
/// one for `frier` and the film above the series for `cowboy bebo` — see
/// <see cref="MalRelevance"/>. TMDB's order is kept as it comes.</item>
/// <item><b>MAL's 0 means unknown.</b> An unaired entry answers `num_episodes: 0` rather than
/// null, and storing that would claim a cour with no episodes in it.</item>
/// </list>
/// </summary>
public sealed class AnimeCatalogService(
    HobbyTrackerDbContext db,
    IMalClient mal,
    IOptions<MalOptions> options,
    ILogger<AnimeCatalogService> logger,
    ICurrentUser user) : IAnimeCatalogService
{
    /// <summary>
    /// How many titles one refresh will touch. One request per title, because MAL has no
    /// batch-by-id endpoint — this bounds the work rather than the size of any one request.
    /// </summary>
    private const int RefreshCeiling = 5_000;

    public async Task<IReadOnlyList<AnimeDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken)
    {
        var wanted = limit ?? options.Value.DefaultSearchLimit;
        var found = await mal.SearchAsync(search, wanted, cancellationToken);

        if (found.Count == 0)
        {
            return [];
        }

        var stored = await UpsertAsync(found, cancellationToken);

        // Re-ranked before the database is consulted, so the ordering is decided on what MAL
        // said rather than on what happens to be stored. Films and shows keep TMDB's order
        // because TMDB's is already relevance-ranked; MAL's is not, in a way that is obvious the
        // first time somebody types half a title.
        return
        [
            .. MalRelevance.Rank(found, search)
                .Select(result => stored.GetValueOrDefault(ExternalIdOf(result)))
                .Where(anime => anime is not null)
                .Select(anime => AnimeDto.From(anime!))
        ];
    }

    public async Task<AnimeDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken)
    {
        // Querying the derived DbSet is what makes this correct under TPT: it emits an INNER
        // JOIN of media and anime, so a show is not found here rather than returned with empty
        // anime fields.
        var anime = await db.Anime
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (anime is null)
        {
            return null;
        }

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return AnimeDetailDto.From(anime, entries);
    }

    public async Task<AnimeDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken)
    {
        var anime = await db.Anime
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (anime is null)
        {
            return null;
        }

        // Blank means "use the automatic pick", which is what null means in the column. An empty
        // string would be a third state nothing else in the app understands.
        anime.PrimaryGenre = string.IsNullOrWhiteSpace(genre) ? null : genre.Trim();
        await db.SaveChangesAsync(cancellationToken);

        var entries = await EntriesFor(mediaId).AsNoTracking().ToListAsync(cancellationToken);

        return AnimeDetailDto.From(anime, entries);
    }

    public async Task<int> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
        // Deliberately not scoped to the signed-in user: it selects on "anybody has logged this"
        // and writes only shared columns. All four catalog services carry the same note, because
        // every one of them reads like a missed scoping site and none of them is one.
        var ids = await db.Anime
            .Where(anime => anime.SourceId == SeedData.Sources.Mal
                            && anime.ExternalId != null
                            && anime.LogEntries.Any())
            .Select(anime => anime.Id)
            .Take(RefreshCeiling)
            .ToListAsync(cancellationToken);

        var refreshed = 0;

        foreach (var mediaId in ids)
        {
            // One request per title, because MAL has no batch-by-id endpoint. One title failing
            // is not a reason to abandon the rest of somebody's library.
            try
            {
                if (await RefreshAsync(mediaId, cancellationToken))
                {
                    refreshed++;
                }
            }
            catch (MalException exception)
            {
                logger.LogWarning(
                    exception, "Refreshing media {MediaId} from MAL failed; moving on.", mediaId);
            }
        }

        return refreshed;
    }

    /// <summary>
    /// Re-reads one title from MAL and writes back everything but the chosen genre.
    ///
    /// <b>Private, unlike <c>TvCatalogService.EnrichAsync</c>, because nothing outside the
    /// refresh needs it.</b> A film and a show reach the board half-known and are completed on
    /// add; an anime arrives complete, so this exists only to pick up a column a migration
    /// added later.
    /// </summary>
    private async Task<bool> RefreshAsync(int mediaId, CancellationToken cancellationToken)
    {
        var anime = await db.Anime
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        // Not an anime, or hand-entered and so not MAL's to describe.
        if (anime?.ExternalId is null || !int.TryParse(anime.ExternalId, out var malId))
        {
            return false;
        }

        var detail = await mal.GetAsync(malId, cancellationToken);

        if (detail is null)
        {
            // MAL no longer knows the id. Keep what was last known rather than blanking a card
            // over somebody else's record going away.
            logger.LogInformation(
                "MAL no longer knows anime {MalId}; leaving media {MediaId} as it was.",
                malId,
                mediaId);

            return false;
        }

        Apply(detail, anime);
        await db.SaveChangesAsync(cancellationToken);

        return true;
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

    private async Task<Dictionary<string, Anime>> UpsertAsync(
        IReadOnlyList<MalAnime> results, CancellationToken cancellationToken)
    {
        // Two tracked entities sharing a key throw on save, so duplicates are collapsed before
        // they reach the change tracker.
        var incoming = results
            .Where(result => !string.IsNullOrWhiteSpace(result.Title))
            .GroupBy(result => result.Id)
            .Select(group => group.First())
            .ToList();

        var externalIds = incoming.Select(ExternalIdOf).ToList();

        var tracked = await db.Anime
            .Where(anime => anime.SourceId == SeedData.Sources.Mal
                            && externalIds.Contains(anime.ExternalId!))
            .ToDictionaryAsync(anime => anime.ExternalId!, StringComparer.Ordinal, cancellationToken);

        foreach (var result in incoming)
        {
            var externalId = ExternalIdOf(result);

            if (!tracked.TryGetValue(externalId, out var anime))
            {
                anime = new Anime
                {
                    HobbyId = SeedData.Hobbies.Anime,
                    SourceId = SeedData.Sources.Mal,
                    ExternalId = externalId,
                    Title = result.Title!,
                };

                db.Anime.Add(anime);
                tracked[externalId] = anime;
            }

            Apply(result, anime);
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
                "Concurrent insert detected during MAL upsert; re-reading the winning rows.");

            db.ChangeTracker.Clear();

            return await db.Anime
                .AsNoTracking()
                .Where(anime => anime.SourceId == SeedData.Sources.Mal
                                && externalIds.Contains(anime.ExternalId!))
                .ToDictionaryAsync(
                    anime => anime.ExternalId!, StringComparer.Ordinal, cancellationToken);
        }

        return tracked;
    }

    /// <summary>
    /// Everything MAL says, written onto the row.
    ///
    /// <b>One method rather than the search/detail pair the other two catalog services have</b>,
    /// because MAL answers the same node at both endpoints. That is also why nothing here needs
    /// the coalesce-onto-the-old-value dance <c>TvCatalogService.ApplySearchResult</c> does: a
    /// search cannot write empties over what a detail call already fetched, since a search *is*
    /// the detail call.
    ///
    /// <b>PrimaryGenre is never touched</b> — it is the one field that is the user's rather than
    /// MAL's, exactly as on a game, a film and a show, and a maintenance route nobody ran
    /// deliberately should not undo a decision somebody made.
    /// </summary>
    private static void Apply(MalAnime source, Anime target)
    {
        target.Title = source.Title ?? target.Title;
        target.EnglishTitle = source.AlternativeTitles?.En;

        // The medium size, which is the rung above what a card needs at its widest. MAL sends
        // full URLs rather than TMDB's bare paths, so there is no image helper to route this
        // through and no base URL to configure.
        target.CoverUrl = source.MainPicture?.Medium ?? source.MainPicture?.Large;

        target.MediaType = source.MediaType;

        // **Nought means unknown, not none.** An unaired entry answers 0, and storing it would
        // make a card claim a cour with no episodes in it — which ck_anime_counts_positive would
        // then refuse outright, turning an ordinary search into a 500.
        target.EpisodeCount = Positive(source.NumEpisodes);
        target.EpisodeRuntimeSeconds = Positive(source.AverageEpisodeDuration);

        target.StartSeason = source.StartSeason?.Season;
        target.StartYear = source.StartSeason?.Year;
        target.AirStatus = source.Status;
        target.SourceMaterial = source.Source;

        // Kept in MAL's order, which is roughly how prominent each is. Which one a card is
        // painted as is settled on the client, where the ordering and the palette are one list.
        target.Genres = [.. (source.Genres ?? []).Select(genre => genre.Name).OfType<string>()];
        target.Studios = [.. (source.Studios ?? []).Select(studio => studio.Name).OfType<string>()];

        // MAL sends a double and the column is numeric(4,2). Rounded rather than truncated, and
        // guarded by the same "nought is not a score" rule the counts get: an entry nobody has
        // rated answers 0, which ck_anime_mean_score_range would refuse.
        target.MeanScore = source.Mean is > 0
            ? Math.Round((decimal)source.Mean.Value, 2)
            : null;
    }

    /// <summary>
    /// MAL's nought, read as the "nobody has filled this in" it means.
    ///
    /// Stated once and used for both counts, because getting it wrong on either one is the same
    /// failure: a check constraint refuses the write, and an ordinary search becomes a 500.
    /// </summary>
    private static int? Positive(int? value) => value is > 0 ? value : null;

    private static string ExternalIdOf(MalAnime result) =>
        result.Id.ToString(CultureInfo.InvariantCulture);

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
