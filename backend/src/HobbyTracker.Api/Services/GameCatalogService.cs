using System.Globalization;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
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
    ILogger<GameCatalogService> logger) : IGameCatalogService
{
    public async Task<IReadOnlyList<GameDto>> SearchAsync(
        string search, int? limit, CancellationToken cancellationToken)
    {
        var results = await igdb.SearchGamesAsync(
            search, limit ?? options.Value.DefaultSearchLimit, cancellationToken);

        if (results.Count == 0)
        {
            return [];
        }

        var stored = await UpsertAsync(results, cancellationToken);

        // Hand results back in IGDB's relevance order. That ordering is the entire value of
        // an APIcalypse `search`, and the database has no idea it exists — reading the rows
        // back in id order would put whichever title we happened to see first at the top.
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

        // logged_at DESC, id DESC — the same order the board decides "current" by, so the
        // first entry here *is* the pass the board is showing. A detail view that ordered by
        // anything else would offer to edit one entry while the card reported another.
        var entries = await db.LogEntries
            .AsNoTracking()
            .Include(entry => entry.Media)
            .Where(entry => entry.MediaId == mediaId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id)
            .ToListAsync(cancellationToken);

        return GameDetailDto.From(game, entries);
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
    /// Copies IGDB-owned fields onto the entity. Deliberately leaves the hltb_* columns
    /// alone: HowLongToBeat has no official API, so those are hand-entered and must survive
    /// every refresh from IGDB.
    /// </summary>
    private static void ApplyMetadata(IgdbGame source, Game target)
    {
        target.Title = source.Name!;
        target.CoverUrl = IgdbImage.CoverUrl(source.Cover?.ImageId);

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
    }

    private static string ExternalIdOf(IgdbGame game) =>
        game.Id.ToString(CultureInfo.InvariantCulture);

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation
        };
}
