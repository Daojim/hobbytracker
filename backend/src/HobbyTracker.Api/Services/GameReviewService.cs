using System.Globalization;
using System.Text;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Integrations.OpenCritic;
using HobbyTracker.Api.Integrations.Steam;
using HobbyTracker.Api.Integrations.Wikidata;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Services;

/// <summary>What happened when OpenCritic's number for a game was pinned by hand.</summary>
public enum OpenCriticPinOutcome
{
    /// <summary>No game with that media id.</summary>
    NoSuchGame,

    /// <summary>OpenCritic does not know that number — a typo, or a page since merged away.</summary>
    NoSuchOpenCriticId,

    Pinned,
}

public interface IGameReviewService
{
    /// <summary>
    /// What OpenCritic and Steam say about a game, looking for its two pages first when it is time
    /// to. Null when no game has that media id.
    /// </summary>
    Task<GameReviewsDto?> ReviewsAsync(int mediaId, CancellationToken cancellationToken);

    /// <summary>
    /// Pins OpenCritic's number for a game by hand, checked against OpenCritic when there is a key
    /// to ask with, or takes the pin back with a null. Throws <see cref="OpenCriticException"/> when
    /// OpenCritic cannot be read, which the pin's route answers with a 502.
    /// </summary>
    Task<OpenCriticPinOutcome> PinOpenCriticAsync(
        int mediaId, int? openCriticId, CancellationToken cancellationToken);
}

/// <summary>
/// A game's OpenCritic and Steam pages: finding them, and what each says.
///
/// <para>
/// <b>The pages are found the first time a journal asks, and kept on the game.</b> IGDB names the
/// Steam store page and gives the slug Wikidata files the game under; Wikidata gives OpenCritic's
/// id. A page found is never looked for again, because which page a game has does not change; one
/// found missing is looked for again after <see cref="ReviewsOptions.RecheckAfterDays"/>. A look
/// that could not be made — a provider that could not be read — is not a look that found nothing,
/// so it stamps nothing and the next journal tries again.
/// </para>
///
/// <para>
/// <b>What each page says is asked for when the journal opens, and kept for the journal's day under
/// the provider's own id.</b> Never under a person: a score is the same for everybody who opens the
/// game, and two games naming one Steam app — a remaster that is an update to the original — ask
/// once. What is kept is the provider's answer, as the Discover lists keep IGDB's.
/// </para>
///
/// <para>
/// <b>Each half stands alone.</b> OpenCritic's free plan is 200 requests a day and Steam's keyless
/// route is shared with every keyless caller, so either can be unhappy on a given day; the one that
/// is takes its own verdict with it and nothing else, and its row is its link alone. A failure is
/// not kept, so the next journal asks again.
/// </para>
///
/// <para>
/// Deliberately not part of <see cref="GameCatalogService"/>, as <see cref="HltbService"/> is not:
/// an IGDB refresh's <c>ApplyMetadata</c> cannot touch these columns, so a search re-running over a
/// game cannot undo a pin.
/// </para>
/// </summary>
public sealed class GameReviewService(
    HobbyTrackerDbContext db,
    IIgdbClient igdb,
    IWikidataClient wikidata,
    IOpenCriticClient openCritic,
    ISteamClient steam,
    IMemoryCache cache,
    IJournalClock clock,
    IOptions<ReviewsOptions> options,
    ILogger<GameReviewService> logger) : IGameReviewService
{
    private readonly ReviewsOptions _options = options.Value;

    public async Task<GameReviewsDto?> ReviewsAsync(int mediaId, CancellationToken cancellationToken)
    {
        var game = await PagesOfAsync(mediaId, cancellationToken);

        if (game is null)
        {
            return null;
        }

        // Read again after a look, rather than trusting what the look found: it writes only into a
        // slot still empty, so a pin that landed while it was asking is what the game now has.
        if (await LookAsync(game, cancellationToken))
        {
            game = await PagesOfAsync(mediaId, cancellationToken) ?? game;
        }

        return new GameReviewsDto(
            game.OpenCriticId,
            game.SteamAppId,
            // No key, no question: OpenCritic's row is its link alone until one is set.
            game.OpenCriticId is { } id && openCritic.HasKey
                ? await OpenCriticVerdictAsync(id, cancellationToken)
                : null,
            game.SteamAppId is { } app
                ? await SteamVerdictAsync(app, cancellationToken)
                : null);
    }

    public async Task<OpenCriticPinOutcome> PinOpenCriticAsync(
        int mediaId, int? openCriticId, CancellationToken cancellationToken)
    {
        var game = await db.Games.FirstOrDefaultAsync(
            candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return OpenCriticPinOutcome.NoSuchGame;
        }

        if (openCriticId is null)
        {
            // Back to never looked for, not to looked for and found nothing — HowLongToBeat's rule
            // for a pin taken back. Stamped, the box would stay empty for a month.
            game.OpenCriticId = null;
            game.OpenCriticLookedForAt = null;
        }
        else
        {
            // Checked when there is a key to check with, because the point of typing a number is to
            // learn whether it was right — and the answer is kept as the verdict the journal asks for
            // next. Without a key it is kept as typed: the link is there to follow, and the score
            // arrives with the key. An OpenCriticException goes out to the route's 502.
            if (openCritic.HasKey && await OpenCriticGameAsync(openCriticId.Value, cancellationToken) is null)
            {
                return OpenCriticPinOutcome.NoSuchOpenCriticId;
            }

            game.OpenCriticId = openCriticId;
        }

        await db.SaveChangesAsync(cancellationToken);
        return OpenCriticPinOutcome.Pinned;
    }

    // -------------------------------------------------------------------- finding the pages

    /// <summary>
    /// Looks for whichever of the two pages is due, and writes down what was found. True when it
    /// wrote anything, which is when the caller has to read the game again.
    /// </summary>
    private async Task<bool> LookAsync(Game game, CancellationToken cancellationToken)
    {
        var now = clock.Now;
        var steamDue = Due(game.SteamAppId, game.SteamLookedForAt, now);
        var openCriticDue = Due(game.OpenCriticId, game.OpenCriticLookedForAt, now);

        // A game IGDB did not supply has no IGDB id to ask about, and nothing to find its pages by.
        if (!(steamDue || openCriticDue)
            || game.SourceId != SeedData.Sources.Igdb
            || !int.TryParse(game.ExternalId, NumberStyles.None, CultureInfo.InvariantCulture, out var igdbId))
        {
            return false;
        }

        IgdbGame? links;
        try
        {
            links = await igdb.GetStoreLinksAsync(igdbId, cancellationToken);
        }
        catch (IgdbException ex)
        {
            // Nothing found and nothing stamped: the next journal asks again.
            logger.LogWarning(ex, "Could not ask IGDB for {Title}'s pages; looking again next time.", game.Title);
            return false;
        }

        if (steamDue)
        {
            // IGDB not knowing the game at all is an answer too: no page, stamped.
            await FillSteamAsync(game.Id, links is null ? null : IgdbSteam.AppIdOf(links), now, cancellationToken);
        }

        if (openCriticDue && await FindOpenCriticAsync(game.Title, links?.Slug, cancellationToken) is { } found)
        {
            await FillOpenCriticAsync(game.Id, found.Id, now, cancellationToken);
        }

        return true;
    }

    /// <summary>
    /// Whether a page is to be looked for: never when one was found or pinned, and otherwise when
    /// it never was, or the last look found none and was a while ago.
    /// </summary>
    private bool Due(int? id, DateTimeOffset? lookedForAt, DateTimeOffset now) =>
        id is null
        && (lookedForAt is null || lookedForAt < now.AddDays(-_options.RecheckAfterDays));

    /// <summary>What a look for OpenCritic's page settled on, a null id being a settled "none".</summary>
    private sealed record Settled(int? Id);

    /// <summary>
    /// OpenCritic's id by the game's IGDB slug, or null when nothing was settled and there is
    /// nothing to write down.
    /// </summary>
    private async Task<Settled?> FindOpenCriticAsync(
        string title, string? slug, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(slug))
        {
            return new Settled(null);
        }

        IReadOnlyList<int> ids;
        try
        {
            ids = await wikidata.GetOpenCriticIdsAsync(slug, cancellationToken);
        }
        catch (WikidataException ex)
        {
            logger.LogWarning(ex, "Could not ask Wikidata for {Title}'s OpenCritic page; looking again next time.", title);
            return null;
        }

        switch (ids.Count)
        {
            case 0:
                return new Settled(null);

            case 1:
                return new Settled(ids[0]);
        }

        // Several: an item can carry the game and its editions, NieR: Automata's three or Trails
        // Through Daybreak's two. The one OpenCritic names as IGDB names the game is the game, which
        // picked both right on the user's board. Reading names needs a key, so without one nothing
        // can be chosen yet — and that is not a miss, so it is not written down, and the next
        // journal, perhaps with a key by then, looks again.
        if (!openCritic.HasKey)
        {
            return null;
        }

        List<int> named = [];

        foreach (var id in ids)
        {
            OpenCriticGame? candidate;
            try
            {
                // Through the verdicts' cache, so the one chosen is not asked about a second time
                // when its score is read a moment later.
                candidate = await OpenCriticGameAsync(id, cancellationToken);
            }
            catch (OpenCriticException ex)
            {
                logger.LogWarning(ex, "Could not read OpenCritic's names for {Title}; looking again next time.", title);
                return null;
            }

            if (candidate is not null && SameName(candidate.Name, title))
            {
                named.Add(id);
            }
        }

        // None named so, or more than one: a refusal rather than a guess, as HowLongToBeat's matcher
        // refuses, and written down as none, so the names are not asked for on every open. The pin
        // is for this.
        return new Settled(named.Count == 1 ? named[0] : null);
    }

    /// <summary>
    /// Whether two names are the same once case, accents and punctuation are set aside. OpenCritic
    /// writes <i>Nier: Automata</i> where IGDB writes <i>NieR: Automata</i>, and an edition is a name
    /// with more words in it, never the same one.
    /// </summary>
    private static bool SameName(string one, string other) => Plain(one) == Plain(other);

    private static string Plain(string name)
    {
        var builder = new StringBuilder(name.Length);
        var space = false;

        foreach (var character in name.Normalize(NormalizationForm.FormKD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsAsciiLetterOrDigit(character))
            {
                if (space && builder.Length > 0)
                {
                    builder.Append(' ');
                }

                builder.Append(char.ToLowerInvariant(character));
                space = false;
            }
            else
            {
                space = true;
            }
        }

        return builder.ToString();
    }

    /// <summary>
    /// Writes the Steam page found, and when, <b>only into a slot still empty</b>. Two journals
    /// opening one game for the first time can both look; the second writes nothing.
    /// </summary>
    private Task FillSteamAsync(int mediaId, int? app, DateTimeOffset now, CancellationToken cancellationToken) =>
        db.Games
            .Where(game => game.Id == mediaId && game.SteamAppId == null)
            .ExecuteUpdateAsync(
                set => set
                    .SetProperty(game => game.SteamAppId, app)
                    .SetProperty(game => game.SteamLookedForAt, now),
                cancellationToken);

    /// <summary>
    /// Writes the OpenCritic id found, and when, <b>only into a slot still empty</b> — which is the
    /// whole of what keeps a pin from being overwritten. A pin always holds a number, so a look can
    /// never land on one; and a look reads the slot before it asks Wikidata and writes after, so a
    /// condition read in C# would let a pin typed in between be written over. This one is the
    /// database's, in the same statement as the write.
    /// </summary>
    private Task FillOpenCriticAsync(
        int mediaId, int? found, DateTimeOffset now, CancellationToken cancellationToken) =>
        db.Games
            .Where(game => game.Id == mediaId && game.OpenCriticId == null)
            .ExecuteUpdateAsync(
                set => set
                    .SetProperty(game => game.OpenCriticId, found)
                    .SetProperty(game => game.OpenCriticLookedForAt, now),
                cancellationToken);

    private Task<Game?> PagesOfAsync(int mediaId, CancellationToken cancellationToken) =>
        // The derived set, so a film's media id is not found here: the route answers it with a 404.
        db.Games.AsNoTracking().FirstOrDefaultAsync(game => game.Id == mediaId, cancellationToken);

    // --------------------------------------------------------------------- what each says

    private async Task<OpenCriticVerdictDto?> OpenCriticVerdictAsync(int id, CancellationToken cancellationToken)
    {
        try
        {
            var game = await OpenCriticGameAsync(id, cancellationToken);

            // A number OpenCritic does not know — a pin kept unchecked, or a page merged away — has
            // nothing to say, and the row is its link alone.
            return game is null
                ? null
                : new OpenCriticVerdictDto(game.TopCriticScore, game.Tier, game.PercentRecommended);
        }
        catch (OpenCriticException ex)
        {
            logger.LogWarning(ex, "Could not ask OpenCritic about game {OpenCriticId}.", id);
            return null;
        }
    }

    private async Task<SteamVerdictDto?> SteamVerdictAsync(int app, CancellationToken cancellationToken)
    {
        try
        {
            var summary = await Kept(
                (nameof(ISteamClient), app), () => steam.GetReviewSummaryAsync(app, cancellationToken));

            return summary is null ? null : new SteamVerdictDto(summary.Summary, summary.Positive, summary.Total);
        }
        catch (SteamException ex)
        {
            logger.LogWarning(ex, "Could not ask Steam about app {AppId}.", app);
            return null;
        }
    }

    /// <summary>
    /// One OpenCritic game, kept for the day under its number. Both the verdict and the pin's check
    /// read through here, and so does the name a choice between several ids is made by, so no game
    /// is asked about twice in a day: the free plan is 200 requests.
    /// </summary>
    private Task<OpenCriticGame?> OpenCriticGameAsync(int id, CancellationToken cancellationToken) =>
        Kept((nameof(IOpenCriticClient), id), () => openCritic.GetGameAsync(id, cancellationToken));

    /// <summary>
    /// A provider's answer, kept under the provider and its own id and the journal's day, for at most
    /// <see cref="ReviewsOptions.KeepVerdictsHours"/>. Never under a person, which is the rule that
    /// stops a cache in front of anything made from a board handing one person's answer to the next
    /// — here there is no board, and the key says so by naming nothing else.
    ///
    /// An answer of nothing is kept, because it is one; a failure is not, because the entry is only
    /// written once the provider has answered.
    /// </summary>
    private async Task<T?> Kept<T>((string Provider, int Id) key, Func<Task<T?>> ask)
        where T : class =>
        await cache.GetOrCreateAsync(
            (key.Provider, key.Id, clock.Today),
            entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(_options.KeepVerdictsHours);
                return ask();
            });
}
