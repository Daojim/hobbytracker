using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Infrastructure;
using HobbyTracker.Api.Integrations.Hltb;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Services;

/// <summary>What happened when a HowLongToBeat id was pinned by hand.</summary>
public enum HltbPinOutcome
{
    /// <summary>No game with that media id.</summary>
    NoSuchGame,

    /// <summary>HowLongToBeat does not know that id — a typo, or an entry since merged away.</summary>
    NoSuchHltbId,

    Pinned,
}

public interface IHltbService
{
    /// <summary>
    /// Looks one title up and writes down what came back. True when times were stored.
    ///
    /// Stamps hltb_checked_at either way, which is the distinction that column exists for.
    /// </summary>
    Task<bool> UpdateAsync(int mediaId, CancellationToken cancellationToken);

    /// <summary>
    /// Queues every library title that has not been asked about lately. Returns how many were
    /// queued — not how many changed, which nothing can know yet.
    /// </summary>
    Task<int> BackfillAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Pins a HowLongToBeat id by hand and fetches it at once, or clears the pin with a null.
    /// </summary>
    Task<(HltbPinOutcome Outcome, GameDetailDto? Game)> PinAsync(
        int mediaId, int? hltbId, CancellationToken cancellationToken);
}

/// <summary>
/// Writes HowLongToBeat's numbers onto a game.
///
/// Deliberately not part of GameCatalogService, and deliberately not routed through its
/// ApplyMetadata. That method's contract — stated in its own comment and pinned by two tests —
/// is that an IGDB refresh cannot touch the hltb columns, so a search re-running over a title
/// that has already been matched cannot undo the work. Writing them from a different service
/// keeps that true by construction rather than by care.
/// </summary>
public sealed class HltbService(
    HobbyTrackerDbContext db,
    IHltbClient hltb,
    IHltbQueue queue,
    IJournalClock clock,
    IOptions<HltbOptions> options,
    ILogger<HltbService> logger,

    // Only DetailAsync reads this, and only from a request. UpdateAsync and BackfillAsync touch
    // games alone, so the background worker never asks who is signed in — which is as well,
    // because in its own scope there is no HttpContext and nobody to be.
    ICurrentUser user) : IHltbService
{
    private readonly HltbOptions _options = options.Value;

    public async Task<bool> UpdateAsync(int mediaId, CancellationToken cancellationToken)
    {
        var game = await db.Games.FirstOrDefaultAsync(
            candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return false;
        }

        // A stored id is fetched, never re-matched. That is what makes a match survive both the
        // matching rules changing and — since the by-id route needs no handshake — HowLongToBeat
        // renaming the search endpoint out from under us.
        var found = game.HltbId is { } pinned
            ? await hltb.GetAsync(pinned, cancellationToken)
            : await MatchAsync(game, cancellationToken);

        // Stamped whatever the answer, including a miss. Without that, the backfill re-asks
        // about every unmatchable title on every run for as long as the app exists.
        game.HltbCheckedAt = clock.Now;

        if (found is null)
        {
            await db.SaveChangesAsync(cancellationToken);
            return false;
        }

        Apply(found, game);
        await db.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<int> BackfillAsync(CancellationToken cancellationToken)
    {
        var stale = clock.Now.AddDays(-_options.RecheckAfterDays);

        // The library, not the catalog. media accumulates every result of every search ever
        // typed, and asking HowLongToBeat about all of it would be both slow and rude.
        var wanted = await db.Games
            .Where(game => game.LogEntries.Any()
                           && (game.HltbCheckedAt == null || game.HltbCheckedAt < stale))
            .Select(game => game.Id)
            .ToListAsync(cancellationToken);

        foreach (var mediaId in wanted)
        {
            queue.Enqueue(mediaId);
        }

        logger.LogInformation("Queued {Count} titles for HowLongToBeat.", wanted.Count);

        return wanted.Count;
    }

    public async Task<(HltbPinOutcome Outcome, GameDetailDto? Game)> PinAsync(
        int mediaId, int? hltbId, CancellationToken cancellationToken)
    {
        var game = await db.Games.FirstOrDefaultAsync(
            candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return (HltbPinOutcome.NoSuchGame, null);
        }

        if (hltbId is null)
        {
            // Clearing puts the title back to never-having-been-asked rather than to "asked and
            // found nothing": the numbers were wrong, so leaving a stamp behind would mean the
            // backfill never looked again and the card stayed blank for good.
            game.HltbId = null;
            game.HltbCheckedAt = null;
            ClearTimes(game);

            await db.SaveChangesAsync(cancellationToken);
            return (HltbPinOutcome.Pinned, await DetailAsync(mediaId, cancellationToken));
        }

        var found = await hltb.GetAsync(hltbId.Value, cancellationToken);
        if (found is null)
        {
            // Said out loud rather than stored. Somebody is standing there having typed a number,
            // and silently keeping a pin that answers nothing would look like it worked.
            return (HltbPinOutcome.NoSuchHltbId, null);
        }

        game.HltbCheckedAt = clock.Now;
        Apply(found, game);

        await db.SaveChangesAsync(cancellationToken);
        return (HltbPinOutcome.Pinned, await DetailAsync(mediaId, cancellationToken));
    }

    private async Task<HltbGame?> MatchAsync(Game game, CancellationToken cancellationToken)
    {
        var candidates = await hltb.SearchAsync(game.Title, cancellationToken);
        var match = HltbMatcher.Match(game.Title, game.ReleaseYear, candidates, _options);

        if (match is null)
        {
            logger.LogInformation(
                "No confident HowLongToBeat match for {Title} among {Count} candidates; leaving "
                + "it without numbers.",
                game.Title,
                candidates.Count);
        }

        return match;
    }

    /// <summary>
    /// Copies the three times across, and the id they came from.
    ///
    /// The id is the load-bearing half. Storing it is what turns a match into a decision made
    /// once: every later refresh fetches that id directly instead of searching and matching
    /// again, so the numbers cannot drift onto a different game because a title was edited or
    /// the matching rules were tightened. Leaving it out is not a small omission — it quietly
    /// turns every backfill back into a full re-match.
    ///
    /// The title is pointedly not among them. HowLongToBeat's name for a game is often not
    /// IGDB's — that is the entire reason a matcher exists — and writing it back would let a
    /// lookup quietly rename a card.
    /// </summary>
    private static void Apply(HltbGame source, Game target)
    {
        target.HltbId = source.Id;
        target.HltbAllStylesHours = source.AllStylesHours;
        target.HltbMainStoryHours = source.MainStoryHours;
        target.HltbMainExtraHours = source.MainExtraHours;
        target.HltbCompletionistHours = source.CompletionistHours;
    }

    private static void ClearTimes(Game game)
    {
        game.HltbAllStylesHours = null;
        game.HltbMainStoryHours = null;
        game.HltbMainExtraHours = null;
        game.HltbCompletionistHours = null;
    }

    private async Task<GameDetailDto?> DetailAsync(int mediaId, CancellationToken cancellationToken)
    {
        var game = await db.Games
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == mediaId, cancellationToken);

        if (game is null)
        {
            return null;
        }

        var userId = user.Id;

        // Same ordering as the board and the game detail endpoint. Three places decide which
        // pass is current and all three have to agree.
        var entries = await db.LogEntries
            .AsNoTracking()
            .Include(entry => entry.Media)
            .Include(entry => entry.Notes)
            // The game above is shared catalogue; these are yours. This is the one query in
            // the codebase that spans both, and the split is the whole rule in miniature.
            .Where(entry => entry.MediaId == mediaId && entry.UserId == userId)
            .OrderByDescending(entry => entry.LoggedAt)
            .ThenByDescending(entry => entry.Id)
            .ToListAsync(cancellationToken);

        return GameDetailDto.From(game, entries, clock.Today);
    }
}
