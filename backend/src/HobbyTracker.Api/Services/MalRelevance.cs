using System.Globalization;
using System.Text;
using HobbyTracker.Api.Integrations.Mal.Models;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Puts the anime you meant at the top of a search.
///
/// MAL prefix-matches, which is why <see cref="Integrations.Mal.MalClient"/> asks one question
/// where IGDB asks two — but its ordering is not what a person means. Measured against the live
/// API on 7 September 2026, with a real client id:
///
/// <list type="bullet">
/// <item><c>frier</c> returns <i>Sousou no Frieren 2nd Season</i> above season one.</item>
/// <item><c>cowboy bebo</c> returns the film above the series.</item>
/// <item><c>steins</c> returns the film first, <i>Steins;Gate 0</i> second, and the series
/// <b>third</b>.</item>
/// <item><c>mushishi</c> returns <i>Mushishi Zoku Shou</i> above <i>Mushishi</i>.</item>
/// </list>
///
/// So the rule is <see cref="IgdbRelevance"/>'s, and deliberately the same one:
///
///   1. <b>the anime more people have logged comes first</b> — MAL's own <c>num_list_users</c>,
///      which is the closest thing it publishes to "how many people mean this one". It is what
///      fixes all four cases above, and it fixes them by wide margins: 1.5M against 607k for
///      Frieren, 2.1M against 416k for Bebop, 2.8M against 651k for Steins;Gate.
///   2. <b>how well the title matches breaks the ties.</b>
///   3. <b>MAL's own order breaks what is left</b>, through a stable sort.
///
/// <para>
/// <b>Title-first was tried against the same searches and is worse, in exactly the way
/// <see cref="IgdbRelevance"/> records as the "Zelda" case.</b> Searching <c>monster</c> finds a
/// 2019 Chinese film whose English title is precisely "Monster" and which 135 people have
/// logged; ranking on the title puts it second, above <i>Monster Musume</i> and one place below
/// the Urasawa series it is pretending to be. Popularity-first buries it where it belongs and
/// still answers <i>Monster</i> first, because the thing everybody means is also the thing
/// everybody has logged.
/// </para>
///
/// <para>
/// <c>mean</c> is deliberately not part of this. It is available on every node and no measured
/// search needed it — a third signal with no case behind it is a rule nobody can check.
/// </para>
///
/// Pure and static, like <see cref="IgdbRelevance"/> and <see cref="HltbMatcher"/>, and for the
/// same reason: it is the piece most likely to need another case, and having nothing to fetch or
/// stub keeps that a matter of adding a line to the test file.
/// </summary>
public static class MalRelevance
{
    /// <summary>
    /// The same results, best first. Never filters — a low-ranked result is still a result, and
    /// this is deciding an order rather than deciding what exists.
    /// </summary>
    public static IReadOnlyList<MalAnime> Rank(IReadOnlyList<MalAnime> results, string search)
    {
        if (results.Count <= 1)
        {
            return results;
        }

        var wanted = Normalise(search);

        // OrderBy is a stable sort, so anything this rule has nothing to say about keeps the
        // order MAL put it in.
        return
        [
            .. results
                .OrderByDescending(anime => anime.NumListUsers ?? 0)
                .ThenByDescending(anime => TitleTier(anime, wanted))
        ];
    }

    /// <summary>
    /// How well a title answers what was typed, over every name MAL knows the entry by.
    ///
    /// <b>All of them, because MAL matched on all of them.</b> `fma` finds Fullmetal Alchemist
    /// through a synonym and touches neither its romaji nor its English title; `attack on t`
    /// finds Shingeki no Kyojin through the English one. Scoring the romaji title alone would
    /// give every result in those searches the same nought and throw the tie-break away.
    ///
    /// Coarse on purpose, as IGDB's is: this is a tie-break rather than a score, and a
    /// continuous similarity would separate two spellings of one name by a hair and then settle
    /// the pair on that hair.
    /// </summary>
    private static int TitleTier(MalAnime anime, string wanted)
    {
        if (wanted.Length == 0)
        {
            return 0;
        }

        return Names(anime).Max(name => Tier(Normalise(name), wanted));
    }

    private static int Tier(string name, string wanted) => name switch
    {
        _ when name.Length == 0 => 0,
        _ when name == wanted => 3,
        _ when name.StartsWith(wanted, StringComparison.Ordinal) => 2,
        _ when name.Contains(wanted, StringComparison.Ordinal) => 1,
        _ => 0,
    };

    /// <summary>Every name MAL knows an entry by: romaji, English, Japanese, and the synonyms.</summary>
    private static IEnumerable<string> Names(MalAnime anime)
    {
        yield return anime.Title ?? string.Empty;
        yield return anime.AlternativeTitles?.En ?? string.Empty;
        yield return anime.AlternativeTitles?.Ja ?? string.Empty;

        foreach (var synonym in anime.AlternativeTitles?.Synonyms ?? [])
        {
            yield return synonym;
        }
    }

    /// <summary>
    /// Lower-cased, unaccented, and with every run of punctuation flattened to a single space.
    ///
    /// A copy of <see cref="IgdbRelevance"/>'s and not shared with it, which is a real choice
    /// rather than an oversight: sharing would make one function answer to two providers, and
    /// the next case either of them needs would then have to be checked against the other. What
    /// is being erased here is how somebody typed a name, and that is all — the same argument
    /// that keeps this out of <see cref="HltbMatcher"/>'s normalisation, which additionally
    /// folds roman numerals because it is reconciling two catalogues rather than one.
    ///
    /// It does real work on this provider. `Steins;Gate` becomes `steins gate`, so typing the
    /// semicolon or not makes no difference, and `Sousou no Frieren: ●● no Mahou` loses a
    /// character no keyboard offers.
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
