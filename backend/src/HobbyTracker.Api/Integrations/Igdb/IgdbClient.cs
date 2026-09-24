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

    // The Discover page's four lists. Each answers with the <limit> places from <offset> on, so a
    // page can start wherever the page before it stopped.

    /// <summary>Games first released between two instants, the most hyped first.</summary>
    Task<IgdbSlice> GetNewReleasesAsync(
        DateTimeOffset since, DateTimeOffset until, int offset, int limit, CancellationToken cancellationToken);

    /// <summary>Games not out yet that somebody is waiting for, the most hyped first.</summary>
    Task<IgdbSlice> GetAnticipatedAsync(
        DateTimeOffset now, int offset, int limit, CancellationToken cancellationToken);

    /// <summary>The games the most people have rated.</summary>
    Task<IgdbSlice> GetMostRatedAsync(int offset, int limit, CancellationToken cancellationToken);

    /// <summary>PopScore's Playing list, in PopScore's order.</summary>
    Task<IgdbSlice> GetPlayingNowAsync(int offset, int limit, CancellationToken cancellationToken);
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
    // `category` enum they used to share numbering with — most recently on 24 September 2026.
    // Only the excluded ones are named; the rest are in docs/games-igdb.md under Game types.
    private const int BundleType = 3;
    private const int ModType = 5;

    // Excluded from the Discover lists only. See Discoverable.
    private const int DlcType = 1;
    private const int SeasonType = 7;
    private const int UpdateType = 14;

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

    /// <summary>IGDB's Erotic theme, read off <c>/v4/themes</c>. See <see cref="Discoverable"/>.</summary>
    private const int EroticTheme = 42;

    /// <summary>
    /// PopScore's Playing list: what IGDB's members say they are playing. Read off
    /// <c>/v4/popularity_types</c>, and the same id IGDB's own documentation lists.
    /// </summary>
    private const int PlayingPopularityType = 3;

    /// <summary>
    /// What every discovery query asks of a game, over and above whatever list it is.
    ///
    /// <para>
    /// <b>No title tagged Erotic</b>, because these lists are shown to somebody who typed nothing.
    /// Measured on 23 September 2026: 11 of PopScore's top 60 Visits carried the theme, and one sat
    /// in the top 40 of the most-hyped titles not yet out. <c>themes != (42)</c> keeps a game with
    /// no themes at all rather than dropping it — measured on one that has none. A search
    /// deliberately does not carry this: somebody who typed a title asked for it.
    /// </para>
    ///
    /// <para>
    /// <b>No add-ons</b>: search's bundles and mods, and DLC, seasons and updates besides. None of
    /// the three appeared in the top 60 of any list, which is as far as the first measurement
    /// went. Load more goes further, and on 24 September 2026 eight of New releases' first 500 were
    /// one — <i>Medieval Dynasty: Hunting Pack</i>, <i>Core Keeper: Riders of the Underground</i> —
    /// from page three on. A search keeps them, because a person searching for <i>Shadow of the
    /// Erdtree</i> wants the DLC; a wall is for finding games to play.
    /// </para>
    /// </summary>
    private static readonly string Discoverable =
        $"game_type != ({DlcType},{BundleType},{ModType},{SeasonType},{UpdateType}) & themes != ({EroticTheme})";

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
        var byRelevance = QueryAsync<IgdbGame>(
            GamesEndpoint,
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
            : QueryAsync<IgdbGame>(
                GamesEndpoint,
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

        return QueryAsync<IgdbGame>(GamesEndpoint, query, cancellationToken);
    }

    /// <summary>
    /// The Discover page's New releases: games first released inside a window, the most hyped
    /// first.
    ///
    /// <para>
    /// Hype rather than ratings, because a game out for a fortnight has hardly been rated. Sorted
    /// by ratings on 23 September 2026, Valheim's 1.0 came first on 301 carried over from early
    /// access and nothing after it had more than 36.
    /// </para>
    ///
    /// <para>
    /// <b>And only what has any hype, so the list ends where its order stops meaning anything.</b>
    /// On 24 September 2026, 3,344 games came out in the window and 552 of them had hype. Past the
    /// 552nd the sort is sorting nothing — 2,800 titles tied at none, in whatever order IGDB keeps
    /// them — and a Load more there would page through an arbitrary slice of two months of
    /// releases. Page one's lowest hype was 11, so this moves where the list ends and nothing
    /// about how it starts.
    /// </para>
    /// </summary>
    public Task<IgdbSlice> GetNewReleasesAsync(
        DateTimeOffset since, DateTimeOffset until, int offset, int limit, CancellationToken cancellationToken) =>
        SliceAsync(
            $"""
            {SearchFields}
            where first_release_date >= {since.ToUnixTimeSeconds()} & first_release_date <= {until.ToUnixTimeSeconds()} & hypes != null & {Discoverable};
            sort hypes desc;
            limit {limit};
            offset {offset};
            """,
            offset,
            limit,
            cancellationToken);

    /// <summary>
    /// The Discover page's Most anticipated: games not out yet, the most hyped first.
    ///
    /// <para>
    /// Undated counts as not out — The Elder Scrolls VI, second on the list, has no
    /// <c>first_release_date</c> at all. <c>hypes != null</c> is what keeps that from being every
    /// one of the 53,096 undated main games IGDB holds, which are mostly nothing.
    /// </para>
    ///
    /// <para>
    /// This is IGDB's idea of "not out", and it is not the app's: a game in alpha or early access
    /// has no release date and people are playing it. The caller holds the answer to that, with
    /// the same expression the calendar is drawn by.
    /// </para>
    /// </summary>
    public Task<IgdbSlice> GetAnticipatedAsync(
        DateTimeOffset now, int offset, int limit, CancellationToken cancellationToken) =>
        SliceAsync(
            $"""
            {SearchFields}
            where hypes != null & (first_release_date > {now.ToUnixTimeSeconds()} | first_release_date = null) & {Discoverable};
            sort hypes desc;
            limit {limit};
            offset {offset};
            """,
            offset,
            limit,
            cancellationToken);

    /// <summary>
    /// The Discover page's Most played: the games the most people have rated, which is the list
    /// for filling a board backwards.
    ///
    /// PopScore has a Played list, and on 23 September 2026 it held the same games as this in 14
    /// of its top 15. This is one request with the filter inside it, where that is two with the
    /// filter after.
    /// </summary>
    public Task<IgdbSlice> GetMostRatedAsync(int offset, int limit, CancellationToken cancellationToken) =>
        SliceAsync(
            $"""
            {SearchFields}
            where total_rating_count != null & {Discoverable};
            sort total_rating_count desc;
            limit {limit};
            offset {offset};
            """,
            offset,
            limit,
            cancellationToken);

    /// <summary>
    /// The Discover page's Popular now: PopScore's Playing list, recalculated by IGDB once a day.
    ///
    /// <para>
    /// <b>Two questions, because a ranking row carries nothing but a game id.</b> PopScore ranks;
    /// <c>/games</c> then describes, and answers in an order of its own, so the ranking is put back
    /// afterwards. The filter can only go on the second question, which means it runs after the
    /// limit: ask for more than the wall holds and let the caller trim.
    /// </para>
    ///
    /// <para>
    /// <b>The page is a stretch of the ranking</b>, so the offset goes on the first question and
    /// each game keeps the place PopScore gave it — including when the second question declines
    /// the game before it, which is what leaves a hole in the slice. See <see cref="IgdbSlice"/>.
    /// </para>
    ///
    /// <para>
    /// Playing rather than any of PopScore's other ten lists, all of them measured. Visits carried
    /// 11 erotic titles in its top 60; Steam's lists lean on PC live-service games, and its top
    /// sellers are sales, bundles and DLC; Twitch's had not been recalculated for a week.
    /// </para>
    /// </summary>
    public async Task<IgdbSlice> GetPlayingNowAsync(
        int offset, int limit, CancellationToken cancellationToken)
    {
        var ranking = await QueryAsync<IgdbPopularityPrimitive>(
            PopScoreEndpoint,
            $"""
            fields game_id;
            where popularity_type = {PlayingPopularityType};
            sort value desc;
            limit {limit};
            offset {offset};
            """,
            cancellationToken);

        var ended = ranking.Count < limit;

        // `where id = ();` is a parse error — found by sending one — and there is nothing to ask.
        if (ranking.Count == 0)
        {
            return new IgdbSlice([], ended);
        }

        // A game ranked twice keeps its better place, and is asked about once.
        var ranked = ranking
            .Select((row, index) => (Id: row.GameId, Place: offset + index))
            .DistinctBy(row => row.Id)
            .ToList();

        var games = await QueryAsync<IgdbGame>(
            GamesEndpoint,
            $"""
            {SearchFields}
            where id = ({string.Join(',', ranked.Select(row => row.Id))}) & {Discoverable};
            limit {ranked.Count};
            """,
            cancellationToken);

        var byId = games.DistinctBy(game => game.Id).ToDictionary(game => game.Id);

        return new IgdbSlice(
            [.. ranked.Where(row => byId.ContainsKey(row.Id)).Select(row => new IgdbRanked(row.Place, byId[row.Id]))],
            ended);
    }

    /// <summary>
    /// A Discover list's question to <c>/games</c>, answered as a slice of its ordering.
    ///
    /// IGDB applies <c>where</c>, then <c>sort</c>, then <c>offset</c> and <c>limit</c>, so what comes
    /// back is consecutive places from the offset — this list's own filter never leaves a hole.
    /// </summary>
    private async Task<IgdbSlice> SliceAsync(
        string query, int offset, int limit, CancellationToken cancellationToken)
    {
        var games = await QueryAsync<IgdbGame>(GamesEndpoint, query, cancellationToken);

        return new IgdbSlice(
            [.. games.Select((game, index) => new IgdbRanked(offset + index, game))],
            Ended: games.Count < limit);
    }

    private const string GamesEndpoint = "games";
    private const string PopScoreEndpoint = "popularity_primitives";

    private async Task<IReadOnlyList<T>> QueryAsync<T>(
        string endpoint, string query, CancellationToken cancellationToken)
    {
        logger.LogDebug("IGDB query to /{Endpoint}: {Query}", endpoint, query);

        using var content = new StringContent(query, Encoding.UTF8, "text/plain");

        HttpResponseMessage response;
        try
        {
            response = await httpClient.PostAsync(endpoint, content, cancellationToken);
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
                throw new IgdbException($"IGDB /{endpoint} returned {(int)response.StatusCode}: {body}");
            }

            try
            {
                var rows = await response.Content.ReadFromJsonAsync<List<T>>(
                    JsonOptions, cancellationToken);

                return rows ?? [];
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
