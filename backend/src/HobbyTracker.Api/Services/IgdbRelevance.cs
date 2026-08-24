using System.Globalization;
using System.Text;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Puts the game you meant at the top of a search.
///
/// IGDB ranks on string relevance alone, and string relevance cannot tell a game from a fan
/// game named after it. Searching "Hollow Knight Silksong" returns a Game Boy Color game by
/// one person, with no ratings and no platforms, <em>above</em> Team Cherry's — because the
/// fan game's title is that exact string and the real one has a colon in it. No amount of
/// title matching fixes that; the fan game is genuinely the better string match.
///
/// So the rule is three lines, and each one is the guard on the one below it:
///
///   1. a title that does not contain what you typed <em>at all</em> can never outrank one
///      that does. IGDB pads a search out with fuzzy matches, and without this floor a famous
///      one buries the obscure game you asked for by name — "Celeste" has 1465 ratings and
///      "Celeste Classic 2: Lani's Trek" has none, but nobody typing the latter wanted the
///      former.
///   2. above that floor, the one more people have played comes first. This is what settles
///      the fan game, and it is why popularity is not merely a tie-break: an exact title match
///      nobody has rated should lose to a near match everybody has. Searching "Zelda" turns up
///      a game literally called "Zelda" with no ratings at all, and it must not come first.
///   3. how well the title matches breaks the ties, and IGDB's own order breaks what is left.
///
/// Ordering by title first and popularity second was tried and is wrong: it fixes the fan game
/// and creates the "Zelda" case, which is the same bug wearing a different hat.
///
/// This cannot be done in the query. IGDB rejects a search carrying a sort outright —
/// <c>406 "Search is sorting on relevancy and therefore sort is not applicable on search"</c> —
/// so the ordering has to be re-decided here, over the page IGDB chose to return.
///
/// Pure and static, like <see cref="HltbMatcher"/> and for the same reason: it is the piece
/// most likely to need another case, and having nothing to fetch or stub keeps that a matter of
/// adding a line to the test file.
/// </summary>
public static class IgdbRelevance
{
    /// <summary>
    /// The same results, best first. Never filters — a low-ranked result is still a result,
    /// and this is deciding an order rather than deciding what exists.
    /// </summary>
    public static IReadOnlyList<IgdbGame> Rank(string search, IReadOnlyList<IgdbGame> results)
    {
        if (results.Count <= 1)
        {
            return results;
        }

        var wanted = Normalise(search);

        // OrderBy is a stable sort, and that is the whole of what happens to results this rule
        // has nothing to say about: they keep the order IGDB put them in. Relevance ordering is
        // the entire value of an APIcalypse search, so it is the default rather than the
        // fallback — see GameCatalogService.SearchAsync, which hands them back in this order.
        return
        [
            .. results
                .Select(game => (Game: game, Tier: TitleTier(Normalise(game.Name), wanted)))
                .OrderByDescending(entry => entry.Tier > 0)
                .ThenByDescending(entry => Attention(entry.Game))
                .ThenByDescending(entry => entry.Tier)
                .Select(entry => entry.Game)
        ];
    }

    /// <summary>
    /// How well a title answers what was typed, coarsely on purpose.
    ///
    /// Coarse is the point: a continuous score would separate "Hollow Knight Silksong" from
    /// "Hollow Knight: Silksong" by a hair and settle the pair on that hair, which is exactly
    /// the judgement that gets it wrong. Buckets make near-equal titles genuinely equal, so
    /// something that knows better than string similarity gets to decide.
    ///
    /// Zero is doing more work than the other three: it is the floor in <see cref="Rank"/>,
    /// and it means "IGDB matched this on something that is not in the words you typed".
    /// </summary>
    private static int TitleTier(string title, string wanted) => title switch
    {
        _ when wanted.Length == 0 => 0,
        _ when title == wanted => 3,
        _ when title.StartsWith(wanted, StringComparison.Ordinal) => 2,
        _ when title.Contains(wanted, StringComparison.Ordinal) => 1,
        _ => 0,
    };

    /// <summary>
    /// How many people have said anything about this game at all.
    ///
    /// Ratings and hypes are added rather than chosen between because they cover different
    /// halves of a game's life: an unreleased game has no ratings by definition, and Silksong
    /// sat on 220 hypes and nothing else for years — which was exactly when it was most
    /// searched for. A fan game has neither.
    ///
    /// It is evidence, not a verdict. Plenty of real games have nothing here, which is why this
    /// only ever separates titles that already matched equally well.
    /// </summary>
    private static int Attention(IgdbGame game) =>
        (game.TotalRatingCount ?? 0) + (game.Hypes ?? 0);

    /// <summary>
    /// Lower-cased, unaccented, and with every run of punctuation flattened to a single space.
    ///
    /// Deliberately not shared with <see cref="HltbMatcher"/>'s normalisation, which also folds
    /// roman numerals and drops a leading "The". Those exist because IGDB and HowLongToBeat are
    /// two catalogues that disagree about how to write a name. Here both sides are the same
    /// catalogue, so the only difference worth erasing is how the person typed it.
    /// </summary>
    private static string Normalise(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var builder = new StringBuilder(value.Length);
        var pendingSpace = false;

        foreach (var rune in value.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(rune) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsLetterOrDigit(rune))
            {
                if (pendingSpace && builder.Length > 0)
                {
                    builder.Append(' ');
                }

                builder.Append(char.ToLowerInvariant(rune));
                pendingSpace = false;
            }
            else
            {
                pendingSpace = true;
            }
        }

        return builder.ToString();
    }
}
