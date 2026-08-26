using System.Globalization;
using System.Text;
using HobbyTracker.Api.Integrations.Hltb;

namespace HobbyTracker.Api.Services;

/// <summary>
/// Decides which of HowLongToBeat's candidates is the game, or that none of them is.
///
/// This is the work of the HowLongToBeat feature; fetching is not. The two sites disagree about
/// titles constantly — remasters, anniversary editions, subtitle punctuation, paired releases
/// filed as one entry — and a wrong number here is worse than no number, because the whole point
/// is answering "can I finish this before the weekend is out". So refusing is an ordinary outcome
/// rather than a failure, and the two ways of refusing are deliberate and different:
///
///   * the numerals must agree, outright. "Final Fantasy VII" against "Final Fantasy VIII" scores
///     about 0.97 on letters alone, so no threshold worth having could separate them.
///   * the winner must beat the runner-up by a margin. HowLongToBeat lists "Resident Evil 4"
///     twice under exactly that title, for 2005 and for 2023; picking either on a tie is a coin
///     flip that looks from outside exactly like a confident match.
///
/// Pure and static on purpose. It is the piece most likely to need adjusting as odd titles turn
/// up, and having nothing to fetch or stub is what keeps that a matter of adding a line to the
/// test file rather than arranging a world first.
/// </summary>
public static class HltbMatcher
{
    /// <summary>
    /// The best candidate, or null when none of them is convincing enough to write down.
    /// </summary>
    /// <param name="title">The title as IGDB has it.</param>
    /// <param name="releaseYear">
    /// IGDB's release year, when known. It separates two identical titles and does nothing else:
    /// a lone candidate is never refused over it, because HowLongToBeat files a re-release under
    /// the original's entry and dates it from the original's release. Without a year, two identical
    /// titles are refused rather than guessed between.
    /// </param>
    public static HltbGame? Match(
        string title,
        int? releaseYear,
        IReadOnlyList<HltbGame> candidates,
        HltbOptions options)
    {
        if (candidates.Count == 0)
        {
            return null;
        }

        var wanted = Normalise(title);
        var wantedNumerals = NumeralsIn(wanted);

        // Scored on the title alone first, because whether the year is allowed a say depends on
        // how many candidates survive this.
        var scored = candidates
            .Select(candidate => (Candidate: candidate, Score: ScoreOf(candidate, wanted, wantedNumerals)))
            .Where(entry => entry.Score is not null)
            .Select(entry => (entry.Candidate, Score: entry.Score!.Value))
            .ToList();

        // The year is a tie-breaker, so it only speaks when there is a tie to break.
        //
        // Letting it veto a lone candidate refuses the only answer either site has, and it did:
        // HowLongToBeat files a re-release under the entry for the original and dates that entry
        // from the original's release, so "Paper Mario: The Thousand-Year Door" came back as one
        // candidate dated 2004 against IGDB's 2024, scored 1.0 on the title, and was thrown away
        // at 0.7. The threshold leaves 0.1 of headroom and the penalty starts at 0.2, so any gap
        // past a year was a disqualification wearing a penalty's clothes.
        if (scored.Count > 1)
        {
            scored = [.. scored.Select(entry => (entry.Candidate,
                Score: PenalisedForYear(entry.Score, releaseYear, entry.Candidate.ReleaseYear)))];
        }

        scored = [.. scored.OrderByDescending(entry => entry.Score)];

        if (scored.Count == 0 || scored[0].Score < options.MatchThreshold)
        {
            return null;
        }

        // One candidate has nothing to be ambiguous against, so the margin has no opinion on it.
        if (scored.Count > 1 && scored[0].Score - scored[1].Score < options.AmbiguityMargin)
        {
            return null;
        }

        return scored[0].Candidate;
    }

    /// <summary>
    /// How much this candidate looks like the title, or null if it is disqualified outright.
    ///
    /// Scored against the candidate's own name and every alias it carries, because which of them
    /// IGDB happens to use is not something the two sites ever agreed on — but only the variants
    /// whose numerals match, so an alias cannot smuggle a sequel past the rule.
    /// </summary>
    private static double? ScoreOf(
        HltbGame candidate, string wanted, IReadOnlyList<int> wantedNumerals)
    {
        var comparable = new[] { candidate.Name }
            .Concat(candidate.Aliases)
            .Select(Normalise)
            .Where(name => name.Length > 0 && NumeralsIn(name).SequenceEqual(wantedNumerals))
            .ToList();

        if (comparable.Count == 0)
        {
            return null;
        }

        return comparable.Max(name => Similarity(wanted, name));
    }

    /// <summary>
    /// The score, less whatever the two sites' release years disagree by.
    ///
    /// Applied only where there is more than one candidate to choose between — see Match. A year
    /// apart is agreement rather than evidence, because IGDB and HowLongToBeat disagree about
    /// regional release dates constantly; further apart is worth something when it can separate
    /// two candidates, and worth nothing at all against a candidate standing on its own.
    /// </summary>
    private static double PenalisedForYear(double score, int? releaseYear, int? candidateYear)
    {
        if (releaseYear is not { } mine || candidateYear is not { } theirs)
        {
            return score;
        }

        var gap = Math.Abs(mine - theirs);

        return gap > 1 ? Math.Max(0, score - Math.Min(0.3, 0.1 * gap)) : score;
    }

    /// <summary>
    /// Folds away everything the two sites are allowed to disagree about, and nothing else.
    ///
    /// Conservative deliberately. Aggressive normalising — dropping subtitles, stripping the word
    /// "edition", collapsing everything to letters — is how a matcher becomes confident about the
    /// wrong game, which is the one outcome this whole file exists to avoid.
    /// </summary>
    private static string Normalise(string value)
    {
        var folded = new StringBuilder(value.Length);

        foreach (var character in value.Normalize(NormalizationForm.FormD))
        {
            // Diacritics: HowLongToBeat writes "Pokémon" and its own alias says "Pokemon".
            if (CharUnicodeInfo.GetUnicodeCategory(character) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            folded.Append(char.IsLetterOrDigit(character) ? char.ToLowerInvariant(character) : ' ');
        }

        var words = folded.ToString()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        // A leading "The" is the one word the two sites drop from each other's titles often
        // enough to be worth knowing about. Dropped only at the front, so "Breath of the Wild"
        // keeps its own.
        if (words.Length > 1 && words[0] == "the")
        {
            words = words[1..];
        }

        // Roman numerals become the numbers they are, here rather than only where numerals are
        // compared. Otherwise the two rules disagree with each other: "Final Fantasy VII" and
        // "Final Fantasy 7" are the same game by the numeral rule and 0.82 alike by the letters,
        // which refuses a match this file has already decided is correct.
        return string.Join(' ', words.Select(word =>
            RomanNumerals.TryGetValue(word, out var number)
                ? number.ToString(CultureInfo.InvariantCulture)
                : word));
    }

    /// <summary>
    /// The numbers in an already-normalised title, in order. Normalise has turned the roman
    /// ones into digits, so there is only one shape to read here.
    /// </summary>
    private static IReadOnlyList<int> NumeralsIn(string normalised) =>
    [
        .. normalised.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => int.TryParse(word, CultureInfo.InvariantCulture, out var number)
                ? number
                : (int?)null)
            .Where(number => number.HasValue)
            .Select(number => number!.Value)
    ];

    /// <summary>
    /// Only the forms that actually appear as sequel markers.
    ///
    /// Single L, C, D and M are left out on purpose. They are legal roman numerals, and reading
    /// them as such turns "L.A. Noire" into "50 a noire" — which then stops matching a candidate
    /// written "LA Noire", a disagreement the two sites are entitled to have.
    /// </summary>
    private static readonly Dictionary<string, int> RomanNumerals = new(StringComparer.Ordinal)
    {
        ["i"] = 1, ["ii"] = 2, ["iii"] = 3, ["iv"] = 4, ["v"] = 5,
        ["vi"] = 6, ["vii"] = 7, ["viii"] = 8, ["ix"] = 9, ["x"] = 10,
        ["xi"] = 11, ["xii"] = 12, ["xiii"] = 13, ["xiv"] = 14, ["xv"] = 15,
        ["xvi"] = 16, ["xvii"] = 17, ["xviii"] = 18, ["xix"] = 19, ["xx"] = 20,
    };

    /// <summary>
    /// One minus the edit distance as a fraction of the longer string, so identical is 1 and
    /// nothing in common is 0.
    /// </summary>
    private static double Similarity(string left, string right)
    {
        if (left == right)
        {
            return 1;
        }

        if (left.Length == 0 || right.Length == 0)
        {
            return 0;
        }

        return 1 - (double)EditDistance(left, right) / Math.Max(left.Length, right.Length);
    }

    /// <summary>
    /// Levenshtein, two rows at a time rather than a full matrix — titles are short, but there
    /// is no reason to allocate a rectangle to compare two of them.
    /// </summary>
    private static int EditDistance(string left, string right)
    {
        var previous = new int[right.Length + 1];
        var current = new int[right.Length + 1];

        for (var column = 0; column <= right.Length; column++)
        {
            previous[column] = column;
        }

        for (var row = 1; row <= left.Length; row++)
        {
            current[0] = row;

            for (var column = 1; column <= right.Length; column++)
            {
                var substitution = previous[column - 1]
                                   + (left[row - 1] == right[column - 1] ? 0 : 1);

                current[column] = Math.Min(
                    Math.Min(previous[column] + 1, current[column - 1] + 1), substitution);
            }

            (previous, current) = (current, previous);
        }

        return previous[right.Length];
    }
}
