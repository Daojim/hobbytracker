using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using HobbyTracker.Api.Integrations.Igdb.Models;

namespace HobbyTracker.Api.Integrations.Igdb;

public interface IIgdbClient
{
    Task<IReadOnlyList<IgdbGame>> SearchGamesAsync(
        string search, int limit, CancellationToken cancellationToken);

    /// <summary>
    /// Known games by IGDB id, for the backfill. Empty in, empty out — without asking IGDB.
    /// </summary>
    Task<IReadOnlyList<IgdbGame>> GetGamesAsync(
        IEnumerable<int> ids, CancellationToken cancellationToken);
}

/// <summary>
/// Typed client for IGDB v4. Knows how to write APIcalypse queries and nothing else —
/// authentication is bolted on by <see cref="IgdbAuthHandler"/> further down the pipeline.
/// </summary>
public sealed class IgdbClient(HttpClient httpClient, ILogger<IgdbClient> logger) : IIgdbClient
{
    /// <summary>IGDB returns snake_case keys; this maps them onto PascalCase properties.</summary>
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true,
    };

    // APIcalypse is IGDB's query language, sent as the POST body in text/plain.
    //
    // cover.image_id rather than cover.url: `url` comes back protocol-relative and pinned to
    // the thumbnail size (//images.igdb.com/igdb/image/upload/t_thumb/co2l7l.jpg), so using
    // it means string surgery on every read. The id composes cleanly instead — see IgdbImage.
    //
    // involved_companies.developer alongside the company name because IGDB has no "developer"
    // field on a game: involvement is a join carrying role flags, so we fetch both and filter.
    // total_rating_count and hypes are asked for but never stored. They are what
    // Services.IgdbRelevance uses to break a tie between two titles that match equally
    // well — which is how a fan game called "Hollow Knight Silksong" stops outranking
    // "Hollow Knight: Silksong".
    //
    // release_dates and game_status feed the release calendar. Three things about them are worth
    // knowing before touching this line:
    //
    //   - `date_format` and `game_status`, never the deprecated `category` and `status`. IGDB
    //     leaves a deprecated twin unpopulated rather than removing it, so a query against the
    //     old name comes back absent on every row and reads as perfectly correct — which is the
    //     trap game_type already sprang on this client once.
    //   - `.format` and `.status` rather than the reference ids. Both moved to endpoints of
    //     their own, and the integers those answer with are published nowhere.
    //   - depth three, matching involved_companies.company.name. Measured working, and measured
    //     to cost: a 500-id batch grows from 549 KB to 967 KB, which is the price of not making
    //     a second request per game.
    private const string SearchFields =
        "fields id, name, first_release_date, cover.image_id, platforms.name, genres.name, " +
        "total_rating_count, hypes, " +
        "release_dates.date, release_dates.date_format.format, game_status.status, " +
        "involved_companies.developer, involved_companies.company.name;";

    // IGDB game_type ids, read off /v4/game_types rather than assumed from the deprecated
    // `category` enum they used to share numbering with. Only the two that are excluded are
    // named; the rest are in CLAUDE.md under Game types.
    private const int BundleType = 3;
    private const int ModType = 5;

    /// <summary>
    /// The game types a search should never offer.
    ///
    /// Neither is a thing you play on its own, and IGDB ranks them alongside the real thing —
    /// searching "Hollow Knight" returns a mod of it <em>above</em> the game.
    ///
    /// <para>
    /// <b>Bundle is the arguable one, and is meant to stay easy to take back.</b> It catches
    /// things people genuinely play and would want on a board: <i>Halo: The Master Chief
    /// Collection</i> and <i>The Witcher 3: Game of the Year Edition</i> are both filed as
    /// bundles. Excluded for now because most bundles are shovelware pairs nobody logs, and
    /// re-enabling is one edit: drop <see cref="BundleType"/> from the clause below and delete
    /// the half of the client test and the e2e spec that name a bundle.
    /// </para>
    ///
    /// <para>
    /// <c>category</c> is <b>not</b> the field to write this against. It is deprecated in favour
    /// of <c>game_type</c> and is no longer populated at all — asking for it comes back absent
    /// on every row, so a filter written against it excludes nothing while reading as correct.
    /// </para>
    ///
    /// Deliberately not applied to <see cref="GetGamesAsync"/>: those ids are already on the
    /// board, and a title logged before this filter existed has to stay refreshable.
    /// </summary>
    // static readonly rather than const: C# will only fold an interpolated string into a
    // constant when every hole is itself a constant *string*, and these ids are worth more as
    // numbers than the interpolation is worth as a compile-time fold.
    //
    // A bare condition rather than a whole clause, because the slug query below has a
    // condition of its own to and it with.
    private static readonly string NotABundleOrMod =
        $"game_type != ({BundleType},{ModType})";

    /// <summary>
    /// The shortest slug pattern worth asking about.
    ///
    /// <c>*"a"*</c> matches most of the catalogue, so a one-letter search would come back with
    /// the ten most-rated games containing an "a" — noise dressed as an answer, and a request
    /// nobody wanted. The relevance question still runs.
    /// </summary>
    private const int ShortestSlugPattern = 2;

    /// <summary>
    /// Everything IGDB will admit to knowing about a term, from two questions rather than one.
    ///
    /// <para>
    /// IGDB's <c>search</c> is full text over whole words and does <b>no prefix matching</b>.
    /// "hollow k" answers with nothing at all; "pokemon s" answers with Pokemon Topaz and Name
    /// That Pokemon rather than Pokémon Sword. Typing half a title is the ordinary way to use a
    /// search box, so that is not a limitation worth passing on to the app.
    /// </para>
    ///
    /// <para>
    /// A <c>slug</c> match does the prefix half. Slugs are accent-free where names are not,
    /// which is the only reason "pokemon s" can reach "Pokémon Sword" at all — <c>name ~</c> is
    /// accent-sensitive and finds only the handful of games actually spelled "Pokemon".
    /// </para>
    ///
    /// <para>
    /// Neither question can be dropped. Slugs cannot do abbreviations or numerals: "botw",
    /// "gta v" and "final fantasy 7" all find their game through <c>search</c> and nothing
    /// through slugs. Prefixes are the other way about. So both run, in parallel — sequential
    /// would double how long a keystroke takes to answer — and the caller ranks what comes
    /// back. See <see cref="Services.IgdbRelevance"/>.
    /// </para>
    ///
    /// Answers with up to twice <paramref name="limit"/>, because it asked twice. Ordering the
    /// merged set is the caller's job and so is cutting it back down.
    /// </summary>
    public async Task<IReadOnlyList<IgdbGame>> SearchGamesAsync(
        string search, int limit, CancellationToken cancellationToken)
    {
        // The type filter goes in the query rather than over the results, because IGDB applies
        // where before limit: filtering afterwards would ask for ten and hand back six.
        var byRelevance = QueryAsync(
            $"""
            search "{SanitizeSearchTerm(search)}";
            {SearchFields}
            where {NotABundleOrMod};
            limit {limit};
            """,
            cancellationToken);

        var pattern = SlugPatternOf(search);

        // Sorting is allowed here only because this query carries no `search`: IGDB refuses
        // the two together with a 406 saying relevance is already the sort. Without one, which
        // ten of the hundreds of slug matches come back would be arbitrary.
        var byPrefix = pattern.Length < ShortestSlugPattern
            ? Task.FromResult<IReadOnlyList<IgdbGame>>([])
            : QueryAsync(
                $"""
                {SearchFields}
                where slug ~ *"{pattern}"* & {NotABundleOrMod};
                sort total_rating_count desc;
                limit {limit};
                """,
                cancellationToken);

        var answers = await Task.WhenAll(byRelevance, byPrefix);

        // Relevance first, then whatever only the prefix question found. The same game comes
        // back from both far more often than not, and a repeated id would be upserted twice
        // and rendered as two identical results.
        var merged = new List<IgdbGame>(answers[0]);
        var seen = merged.Select(game => game.Id).ToHashSet();

        merged.AddRange(answers[1].Where(game => seen.Add(game.Id)));

        return merged;
    }

    /// <summary>
    /// Fetches known games by IGDB id — what the backfill uses to bring existing rows up to
    /// date after a new field is added.
    ///
    /// A where clause rather than a search: these ids are already known, so there is no
    /// relevance ranking to preserve. The caller batches; IGDB caps a response at 500.
    /// </summary>
    public Task<IReadOnlyList<IgdbGame>> GetGamesAsync(
        IEnumerable<int> ids, CancellationToken cancellationToken)
    {
        var wanted = ids.Distinct().ToList();

        // `where id = ();` is a parse error, and there is nothing to ask about anyway.
        if (wanted.Count == 0)
        {
            return Task.FromResult<IReadOnlyList<IgdbGame>>([]);
        }

        var query = $"""
            {SearchFields}
            where id = ({string.Join(',', wanted)});
            limit {wanted.Count};
            """;

        return QueryAsync(query, cancellationToken);
    }

    private async Task<IReadOnlyList<IgdbGame>> QueryAsync(
        string query, CancellationToken cancellationToken)
    {
        logger.LogDebug("IGDB query: {Query}", query);

        using var content = new StringContent(query, Encoding.UTF8, "text/plain");

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsync("games", content, cancellationToken);
        }
        catch (HttpRequestException ex)
        {
            throw new IgdbException("Could not reach IGDB.", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            // Distinguish the client's own timeout from the caller walking away.
            throw new IgdbException("IGDB did not respond within the configured timeout.", ex);
        }

        using (response)
        {
            if (response.StatusCode == HttpStatusCode.TooManyRequests)
            {
                // IGDB allows 4 requests per second. A single user searching will not get
                // near it, so treat this as exceptional rather than backing off silently.
                throw new IgdbException("IGDB rate limit exceeded (4 requests/second).");
            }

            if (!response.IsSuccessStatusCode)
            {
                // IGDB reports malformed APIcalypse as a 400 with the parse error in the
                // body, which is by far the most useful thing to log while iterating.
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new IgdbException($"IGDB /games returned {(int)response.StatusCode}: {body}");
            }

            try
            {
                var games = await response.Content.ReadFromJsonAsync<List<IgdbGame>>(
                    JsonOptions, cancellationToken);

                return games ?? [];
            }
            catch (JsonException ex)
            {
                throw new IgdbException("IGDB returned a response that could not be parsed.", ex);
            }
        }
    }

    /// <summary>
    /// APIcalypse delimits the search term with double quotes and defines no escape sequence
    /// for a literal one, so a quote in the term would end the clause early and leave the
    /// rest of the user's input to be parsed as query syntax. Since there is no way to escape
    /// them, they come out — along with backslashes, which IGDB rejects outright.
    /// </summary>
    private static string SanitizeSearchTerm(string search) =>
        search.Replace("\"", string.Empty)
              .Replace("\\", string.Empty)
              .Replace("\n", " ")
              .Replace("\r", " ")
              .Trim();

    /// <summary>
    /// What a term looks like once IGDB has made a slug of it: lower case, accents folded, and
    /// every run of anything else turned into a single hyphen. "Pokémon S" becomes
    /// <c>pokemon-s</c>, which is the prefix of <c>pokemon-sword</c> and <c>pokemon-silver-version</c>.
    ///
    /// This doubles as the escaping. The result can only hold letters, digits and hyphens, so
    /// there is nothing left that could close the APIcalypse string early — which is a rule
    /// <see cref="SanitizeSearchTerm"/> has to enforce by hand because it keeps spaces.
    /// </summary>
    private static string SlugPatternOf(string search)
    {
        var builder = new StringBuilder(search.Length);
        var pendingHyphen = false;

        foreach (var rune in search.Normalize(NormalizationForm.FormD))
        {
            if (CharUnicodeInfo.GetUnicodeCategory(rune) == UnicodeCategory.NonSpacingMark)
            {
                continue;
            }

            if (char.IsAsciiLetterOrDigit(rune))
            {
                if (pendingHyphen && builder.Length > 0)
                {
                    builder.Append('-');
                }

                builder.Append(char.ToLowerInvariant(rune));
                pendingHyphen = false;
            }
            else
            {
                pendingHyphen = true;
            }
        }

        return builder.ToString();
    }
}
