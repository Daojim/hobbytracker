using System.Globalization;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Npgsql;

namespace HobbyTracker.Api.Services;

public interface IGameCatalogService
{
    Task<IReadOnlyList<GameDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken);

    /// <summary>Returns null when no game with that media id exists.</summary>
    Task<GameDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken);

    /// <summary>
    /// Chooses the genre that stands for a game, or clears the choice back to the automatic
    /// pick. Null when no game with that media id exists.
    /// </summary>
    Task<GameDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken);

    /// <summary>
    /// Re-fetches every IGDB-sourced title on the board and re-applies IGDB's metadata.
    ///
    /// The library, not the catalog: searching upserts every result, so `media` accumulates
    /// whatever has ever been typed into a search box, and asking IGDB about all of it would be
    /// slow and rude to a service that never agreed to serve us.
    /// </summary>
    Task<int> RefreshLibraryAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Searches IGDB and folds the results into the local catalog.
///
/// The shape is "external source of truth, local cache": IGDB owns game metadata, and this
/// service keeps a copy of everything the user has actually looked at, so that log entries
/// have something stable to point at even if IGDB later moves or deletes a record.
/// </summary>
public sealed class GameCatalogService(
    HobbyTrackerDbContext db,
    IIgdbClient igdb,
    IOptions<IgdbOptions> options,
    ILogger<GameCatalogService> logger,
    ICurrentUser user) : IGameCatalogService
{
    public async Task<IReadOnlyList<GameDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken)
    {
        var wanted = limit ?? options.Value.DefaultSearchLimit;
        var found = await igdb.SearchGamesAsync(search, wanted, cancellationToken);

        if (found.Count == 0)
        {
            return [];
        }

        // Ranked here rather than asked for in the query: IGDB refuses a search carrying a
        // sort outright, with a 406 saying so. See IgdbRelevance for what it is fixing.
        //
        // Cut back to what was asked for only *after* ranking, and before the upsert. The
        // client answers two questions at once and so can hand back twice this many, and
        // trimming first would throw away the prefix matches that are usually the good ones.
        // Trimming before the upsert is what keeps the catalogue growing at the rate it
        // always did — searching still writes one row per result a person could have seen.
        List<IgdbGame> results = [.. IgdbRelevance.Rank(search, found).Take(wanted)];

        var stored = await UpsertAsync(results, cancellationToken);

        // Hand results back in the ranked order. IGDB's relevance is most of it and the
        // database has no idea it exists — reading the rows back in id order would put
        // whichever title we happened to see first at the top.
        return
        [
            .. results
                .Select(result => stored.GetValueOrDefault(ExternalIdOf(result)))
                .Where(game => game is not null)
                .Select(game => GameDto.From(game!))
        ];
    }

    public async Task<GameDetailDto?> GetAsync(int mediaId, CancellationToken cancellationToken)
    {
        // Querying the derived DbSet is what makes this correct under TPT: it emits an INNER
        // JOIN of media and games, so a media row with no game detail — a film, once movies
        // lands — is not found here rather than returned with empty game fields.
        var game = await db.Games
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return null;
        }

        var userId = user.Id;

        // logged_at DESC, id DESC — the same order the board decides "current" by, so the
        // first entry here *is* the pass the board is showing. A detail view that ordered by
        // anything else would offer to edit one entry while the card reported another.
        var entries = await db.LogEntries
            .AsNoTracking()
            .Include(entry => entry.Media)
            .Include(entry => entry.Notes)
            // The game above is shared catalogue; these are yours. This is the one query in the
            // codebase that spans both, and the split is the whole rule in miniature.
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id)
            .ToListAsync(cancellationToken);

        return GameDetailDto.From(game, entries);
    }

    public async Task<GameDetailDto?> SetPrimaryGenreAsync(
        int mediaId, string? genre, CancellationToken cancellationToken)
    {
        var game = await db.Games
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return null;
        }

        // Blank and absent are the same thing here: both mean "go back to the automatic pick",
        // and storing an empty string would be a third state nothing knows how to read.
        game.PrimaryGenre = string.IsNullOrWhiteSpace(genre) ? null : genre.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return await GetAsync(mediaId, cancellationToken);
    }

    /// <summary>IGDB caps a response at 500, so ask for at most that many at a time.</summary>
    private const int RefreshBatchSize = 500;

    public async Task<int> RefreshLibraryAsync(CancellationToken cancellationToken)
    {
        // Only titles something has been logged against, and only ones IGDB can be asked about.
        var wanted = await db.Games
            .Where(game => game.SourceId == SeedData.Sources.Igdb
                           && game.ExternalId != null
                           && game.LogEntries.Any())
            .Select(game => game.ExternalId!)
            .ToListAsync(cancellationToken);

        var ids = wanted
            .Select(external => int.TryParse(external, CultureInfo.InvariantCulture, out var id)
                ? id
                : (int?)null)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToList();

        var refreshed = 0;

        foreach (var batch in ids.Chunk(RefreshBatchSize))
        {
            var results = await igdb.GetGamesAsync(batch, cancellationToken);
            if (results.Count == 0)
            {
                continue;
            }

            // Straight back through the upsert every search uses, so a refreshed row and a
            // searched one are written by the same code — including its care about what IGDB
            // does not own. A title IGDB no longer returns is simply not in the results, and
            // keeps whatever was last known about it.
            var stored = await UpsertAsync(results, cancellationToken);
            refreshed += stored.Count;
        }

        return refreshed;
    }

    /// <summary>
    /// Inserts games we have not seen and refreshes the ones we have, keyed on
    /// (source, external id). Returns every affected row by external id.
    /// </summary>
    private async Task<Dictionary<string, Game>> UpsertAsync(
        IReadOnlyList<IgdbGame> results, CancellationToken cancellationToken)
    {
        // IGDB can repeat an id across relevance tiers, and two tracked entities sharing a
        // key throw on save — so collapse duplicates before they reach the change tracker.
        var incoming = results
            .Where(result => !string.IsNullOrWhiteSpace(result.Name))
            .GroupBy(result => result.Id)
            .Select(group => group.First())
            .ToList();

        var externalIds = incoming.Select(ExternalIdOf).ToList();

        // Querying the derived DbSet under TPT emits an INNER JOIN of media and games, so
        // this returns only rows that already carry game detail, fully materialised.
        var tracked = await db.Games
            .Where(game => game.SourceId == SeedData.Sources.Igdb
                           && externalIds.Contains(game.ExternalId!))
            .ToDictionaryAsync(game => game.ExternalId!, StringComparer.Ordinal, cancellationToken);

        foreach (var result in incoming)
        {
            var externalId = ExternalIdOf(result);

            if (!tracked.TryGetValue(externalId, out var game))
            {
                game = new Game
                {
                    HobbyId = SeedData.Hobbies.Games,
                    SourceId = SeedData.Sources.Igdb,
                    ExternalId = externalId,
                    Title = result.Name!,
                };

                db.Games.Add(game);
                tracked[externalId] = game;
            }

            ApplyMetadata(result, game);
        }

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException ex) when (IsUniqueViolation(ex))
        {
            // Another request inserted one of these titles between our read and our write.
            // The partial unique index on (source_id, external_id) is what turns that race
            // into a clean failure instead of a duplicate row; the loser just re-reads.
            logger.LogInformation(
                "Concurrent insert detected during IGDB upsert; re-reading the winning rows.");

            // The failed Added entities are still tracked and would shadow the real rows.
            db.ChangeTracker.Clear();

            return await db.Games
                .AsNoTracking()
                .Where(game => game.SourceId == SeedData.Sources.Igdb
                               && externalIds.Contains(game.ExternalId!))
                .ToDictionaryAsync(game => game.ExternalId!, StringComparer.Ordinal, cancellationToken);
        }

        return tracked;
    }

    /// <summary>
    /// Copies IGDB-owned fields onto the entity. Deliberately leaves the hltb_* columns and
    /// primary_genre alone: those are written by HltbService and by the reader respectively,
    /// and both must survive every refresh from IGDB. A search re-running over a title that has
    /// already been matched to HowLongToBeat must not undo that work.
    /// </summary>
    private static void ApplyMetadata(IgdbGame source, Game target)
    {
        target.Title = source.Name!;
        target.CoverUrl = IgdbImage.CoverUrl(source.Cover?.ImageId);

        // Read in UTC rather than the journal zone. This is compared against HowLongToBeat's
        // release_world, which is a bare year belonging to no timezone at all, so localising
        // would only invent a distinction the other side of the comparison cannot carry.
        target.ReleaseYear = source.FirstReleaseDate is { } seconds
            ? DateTimeOffset.FromUnixTimeSeconds(seconds).UtcDateTime.Year
            : null;

        target.Platforms =
        [
            .. (source.Platforms ?? [])
                .Select(platform => platform.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Order(StringComparer.OrdinalIgnoreCase)
        ];

        target.Developers =
        [
            .. (source.InvolvedCompanies ?? [])
                .Where(company => company.Developer
                                  && !string.IsNullOrWhiteSpace(company.Company?.Name))
                .Select(company => company.Company!.Name!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Order(StringComparer.OrdinalIgnoreCase)
        ];

        target.Genres =
        [
            .. (source.Genres ?? [])
                .Select(genre => genre.Name)
                .Where(name => !string.IsNullOrWhiteSpace(name))
                .Select(name => name!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Order(StringComparer.OrdinalIgnoreCase)
        ];
    }

    private static string ExternalIdOf(IgdbGame game) =>
        game.Id.ToString(CultureInfo.InvariantCulture);

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
