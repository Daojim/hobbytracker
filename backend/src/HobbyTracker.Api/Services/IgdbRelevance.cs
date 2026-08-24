using System.Globalization;
using System.Text;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Puts the game you meant at the top of a search.
///
/// IGDB ranks on string relevance alone, and string relevance cannot tell a game from a fan game
/// named after it. Searching "Hollow Knight Silksong" returns a Game Boy Color game by one
/// person, with no ratings and one platform, <em>above</em> Team Cherry's — because the fan
/// game's title is that exact string and the real one has a colon in it. No amount of title
/// matching fixes that; the fan game is genuinely the better string match.
///
/// So the rule is:
///
///   1. <b>the game more people have played comes first.</b> <c>total_rating_count + hypes</c>,
///      added rather than chosen between because they cover different halves of a game's life:
///      an unreleased game has no ratings by definition, and Silksong sat on 220 hypes and
///      nothing else for years, which was exactly when it was most searched for. A fan game has
///      neither.
///   2. <b>how well the title matches breaks the ties</b>, which is most of what orders the long
///      tail — nearly everything down there has no ratings at all, and <see cref="TitleTier"/> is
///      what puts "Celeste Witch" above "The Mystery of the Mary Celeste".
///   3. <b>IGDB's own order breaks what is left</b>, through a stable sort.
///
/// <para>
/// Two other rules were tried against the live API and are worse. Ordering by title first and
/// popularity second creates the "Zelda" case: there is a game called exactly "Zelda" with no
/// ratings at all, and it goes straight above <i>The Legend of Zelda</i> — the same bug wearing a
/// different hat. Putting a floor under that instead, so a title not containing the search text
/// can never outrank one that does, then loses "botw": the slug question drags in Botworld
/// Odyssey and RobotWar, and the floor buries <i>Breath of the Wild</i> beneath them. Exempting
/// IGDB's own first pick from the floor rescues "botw" and breaks "gta v" and "final fantasy 7",
/// by promoting that pick above equally-unmatched results with sixty times the ratings.
/// </para>
///
/// <para>
/// That floor was in for a while, and taking it out costs exactly one measured thing: "Doom 3"
/// puts "Phantasy Star III: Generations of Doom" third, where the floor had the Xbox "Doom 3".
/// A third place is worth less than the first place "botw" loses, and the rule is shorter without
/// it. What makes it safe to drop is <see cref="Integrations.Igdb.IgdbClient"/> asking two
/// questions: the candidate set is tight enough now that a famous game is rarely in it by
/// accident — "Celeste Classic 2", "Celeste Witch" and "Hollow Knight Godmaster" each come back
/// with a single candidate.
/// </para>
///
/// This cannot be done in the query. IGDB rejects a search carrying a sort outright —
/// <c>406 "Search is sorting on relevancy and therefore sort is not applicable on search"</c> —
/// so the ordering is re-decided here, over what the two questions found.
///
/// Pure and static, like <see cref="HltbMatcher"/> and for the same reason: it is the piece most
/// likely to need another case, and having nothing to fetch or stub keeps that a matter of adding
/// a line to the test file.
/// </summary>
public static class IgdbRelevance
{
    /// <summary>
    /// The same results, best first. Never filters — a low-ranked result is still a result, and
    /// this is deciding an order rather than deciding what exists.
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
        // the entire value of an APIcalypse search, so it is what this stands on rather than
        // something it replaces.
        return
        [
            .. results
                .OrderByDescending(Attention)
                .ThenByDescending(game => TitleTier(Normalise(game.Name), wanted))
        ];
    }

    /// <summary>
    /// How well a title answers what was typed, coarsely on purpose.
    ///
    /// Coarse because it is a tie-break rather than a score. A continuous similarity would
    /// separate "Hollow Knight Silksong" from "Hollow Knight: Silksong" by a hair and then settle
    /// the pair on that hair, which is exactly the judgement that gets it wrong.
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
    /// Evidence, not a verdict. Plenty of real games have nothing here, and every one of them is
    /// ordered by <see cref="TitleTier"/> instead — which is why the long tail of a search still
    /// reads sensibly rather than arbitrarily.
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
