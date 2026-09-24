using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Covers the two things this client is responsible for: writing APIcalypse, and reading
/// IGDB's snake_case JSON back.
/// </summary>
public sealed class IgdbClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>The relevance half of a search — the one carrying an APIcalypse `search`.</summary>
    private static RecordedRequest SearchQuery(StubHttpMessageHandler stub) =>
        stub.Requests.Single(request => request.Body?.Contains("search \"") == true);

    /// <summary>The prefix half — the one asking about slugs, which carries no `search`.</summary>
    private static RecordedRequest SlugQuery(StubHttpMessageHandler stub) =>
        stub.Requests.Single(request => request.Body?.Contains("slug ~") == true);

    [Fact]
    public async Task Builds_an_apicalypse_query_body()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("halo", 5, Ct);

        var request = SearchQuery(stub);

        // APIcalypse goes in the POST body, not the query string -- a detail that catches
        // everyone the first time they use IGDB.
        request.Method.ShouldBe(HttpMethod.Post);
        request.Uri!.AbsolutePath.ShouldBe("/v4/games");

        request.Body.ShouldNotBeNull();
        request.Body.ShouldContain("search \"halo\";");
        request.Body.ShouldContain("limit 5;");

        // image_id rather than url: url comes back protocol-relative and pinned to thumbnail
        // size, so requesting it would mean string surgery on every read.
        request.Body.ShouldContain("cover.image_id");
        request.Body.ShouldNotContain("cover.url");

        // Developers are a flag on the involvement join, not a field on the game.
        request.Body.ShouldContain("involved_companies.developer");
        request.Body.ShouldContain("involved_companies.company.name");

        // Genres colour the board. IGDB names them from a fixed vocabulary, so the strings that
        // come back are the ones frontend/src/board/genres.ts matches on.
        request.Body.ShouldContain("genres.name");
    }

    [Fact]
    public async Task Asks_how_precisely_a_release_date_is_known_and_not_only_what_it_is()
    {
        // The release calendar's whole input, and it fails silently without this test. A field
        // the client stops asking for is not an error: IGDB omits it, the column fills with
        // nulls for ever, and a null there is indistinguishable from a title IGDB has nothing
        // to say about. MalClientTests asserts its field list for this reason exactly.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("halo", 5, Ct);

        var body = SearchQuery(stub).Body.ShouldNotBeNull();

        // The date alone cannot tell "12 March 2027" from "Q1 2027" — IGDB sends the latter as
        // a day too, and as the *last* day of the window at that.
        body.ShouldContain("release_dates.date");
        body.ShouldContain("release_dates.date_format.format");

        // What the title's own life says, which outranks the window whenever it says anything.
        body.ShouldContain("game_status.status");
    }

    /// <summary>
    /// Captured verbatim from api.igdb.com on 11 September 2026, trimmed to the fields under
    /// test and otherwise untouched. Two games, chosen because between them they carry every
    /// shape this mapping has to survive.
    /// </summary>
    private const string LiveReleaseDatesPayload =
        """
        [
          {
            "id": 194662,
            "name": "The Witcher IV",
            "first_release_date": 1861833600,
            "release_dates": [
              { "id": 956710, "date": 1861833600, "date_format": { "id": 2, "format": "YYYY" } },
              { "id": 956711, "date": 1861833600, "date_format": { "id": 2, "format": "YYYY" } },
              { "id": 956712, "date": 1861833600, "date_format": { "id": 2, "format": "YYYY" } }
            ]
          },
          {
            "id": 279051,
            "name": "Inzoi",
            "first_release_date": 1743120000,
            "release_dates": [
              { "id": 669397, "date": 1743120000, "date_format": { "id": 0, "format": "YYYYMMDD" } },
              { "id": 783279, "date": 1755648000, "date_format": { "id": 0, "format": "YYYYMMDD" } },
              { "id": 919143, "date_format": { "id": 7, "format": "TBD" } },
              { "id": 919144, "date_format": { "id": 7, "format": "TBD" } }
            ],
            "game_status": { "id": 4, "status": "Early Access" }
          }
        ]
        """;

    [Fact]
    public async Task Reads_a_release_window_out_of_what_IGDB_actually_sends()
    {
        // The wire shape, pinned against a real captured response rather than one written to
        // match the reader. Everything here is something the live API does and a hand-written
        // fixture would probably not think to do:
        //
        //   - date_format is nested two deep, so the snake_case policy has to reach it;
        //   - a TBD row carries no `date` key at all, rather than a null or a nought;
        //   - "Early Access" has a space in it, where every other status is one word;
        //   - a game carries several release_dates rows, and Inzoi's disagree with each other.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, LiveReleaseDatesPayload);
        var client = CreateClient(stub);

        var games = await client.GetGamesAsync([194662, 279051], Ct);

        var witcher = games.Single(game => game.Id == 194662);
        witcher.FirstReleaseDate.ShouldBe(1861833600);
        witcher.ReleaseDates.ShouldNotBeNull().Count.ShouldBe(3);
        witcher.ReleaseDates[0].DateFormat.ShouldNotBeNull().Format.ShouldBe("YYYY");
        witcher.GameStatus.ShouldBeNull();

        var inzoi = games.Single(game => game.Id == 279051);
        inzoi.ReleaseDates.ShouldNotBeNull().Count.ShouldBe(4);
        inzoi.ReleaseDates[2].Date.ShouldBeNull();
        inzoi.ReleaseDates[2].DateFormat.ShouldNotBeNull().Format.ShouldBe("TBD");
        inzoi.GameStatus.ShouldNotBeNull().Status.ShouldBe("Early Access");
    }

    [Fact]
    public async Task Turns_what_IGDB_actually_sends_into_the_window_the_calendar_reads()
    {
        // The other half, one step up: the same captured payload through the mapping.
        //
        // The Witcher IV is the case that would go wrong silently. IGDB states "2028" as
        // 2028-12-31 — the *last* day of the window — so a reader that took the date at face
        // value would file the game under December 2028 and show a day CD Projekt never named.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, LiveReleaseDatesPayload);
        var client = CreateClient(stub);

        var games = await client.GetGamesAsync([194662, 279051], Ct);

        var witcher = IgdbRelease.WindowOf(games.Single(game => game.Id == 194662));
        witcher.Precision.ShouldBe(ReleasePrecision.Year);
        witcher.Start.ShouldBe(new DateOnly(2028, 1, 1));
        witcher.End.ShouldBe(new DateOnly(2028, 12, 31));

        // Inzoi has two real dates and two TBD rows. first_release_date picks the first of the
        // real ones; the TBD rows carry no date and can never match.
        var inzoi = games.Single(game => game.Id == 279051);
        var window = IgdbRelease.WindowOf(inzoi);
        window.Precision.ShouldBe(ReleasePrecision.Day);
        window.Start.ShouldBe(new DateOnly(2025, 3, 28));

        // And it is out, whatever its date says, because IGDB says people are playing it.
        IgdbRelease.StatusOf(inzoi).ShouldBe(ReleaseStatus.EarlyAccess);
    }

    [Fact]
    public async Task Does_not_read_the_deprecated_release_date_category()
    {
        // The game_type lesson a second time, and this file already carries the first. IGDB
        // deprecated release_dates.category in favour of date_format and game.status in favour
        // of game_status, and a deprecated twin here stops being populated rather than erroring
        // — so a mapping written against `category` comes back absent on every row, defaults to
        // 0, and calls every game day-precision while reading as perfectly correct.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("halo", 5, Ct);

        var body = SearchQuery(stub).Body.ShouldNotBeNull();

        body.ShouldNotContain("release_dates.category");
        body.ShouldNotContain("game.status");
    }


    [Fact]
    public async Task Asks_two_questions_because_search_cannot_do_prefixes()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("hollow k", 10, Ct);

        // IGDB's `search` is full text over whole words and does no prefix matching at all:
        // "hollow k" answers with nothing, and "pokemon s" answers with Pokemon Topaz rather
        // than Pokémon Sword. A slug match does the prefix half, and slugs are accent-free
        // where names are not — which is the only reason "pokemon s" can reach "Pokémon".
        stub.Requests.Count.ShouldBe(2);

        SearchQuery(stub).Body.ShouldNotBeNull().ShouldContain("search \"hollow k\";");

        var slug = SlugQuery(stub).Body.ShouldNotBeNull();
        slug.ShouldContain("where slug ~ *\"hollow-k\"*");
        slug.ShouldNotContain("search");

        // Without a sort, which ten of the hundreds of slug matches come back is arbitrary.
        // Sorting is only allowed because this query carries no `search` — IGDB refuses the
        // two together with a 406.
        slug.ShouldContain("sort total_rating_count desc;");
    }

    [Theory]
    [InlineData("Pokémon S", "pokemon-s")]
    [InlineData("Hollow Knight: Silksong", "hollow-knight-silksong")]
    [InlineData("  spaced  out  ", "spaced-out")]
    [InlineData("Ni no Kuni II: Revenant Kingdom", "ni-no-kuni-ii-revenant-kingdom")]
    public async Task Writes_the_slug_pattern_the_way_igdb_writes_slugs(
        string search, string expected)
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync(search, 10, Ct);

        // Accents folded and punctuation hyphenated, because that is what IGDB does to build
        // a slug: "Pokémon Sword" is pokemon-sword. Folding is the whole point — `name ~` is
        // accent-sensitive, so matching on names finds only the games nobody has heard of.
        SlugQuery(stub).Body.ShouldNotBeNull().ShouldContain($"slug ~ *\"{expected}\"*");
    }

    [Fact]
    public async Task Merges_both_answers_and_lists_each_game_once()
    {
        // The same game comes back from both questions far more often than not.
        var stub = new StubHttpMessageHandler((request, _) =>
            StubHttpMessageHandler.Respond(
                HttpStatusCode.OK,
                request.Body?.Contains("slug ~") == true
                    ? """[{ "id": 2, "name": "Hollow Knight: Silksong" }, { "id": 1, "name": "Hollow Knight" }]"""
                    : """[{ "id": 1, "name": "Hollow Knight" }]"""));

        var games = await CreateClient(stub).SearchGamesAsync("hollow k", 10, Ct);

        // Relevance first, then whatever only the prefix question found. IgdbRelevance decides
        // the order the caller actually sees; this only has to not lose or repeat anything.
        games.Select(game => game.Id).ShouldBe([1, 2]);
    }

    [Fact]
    public async Task Does_not_ask_about_slugs_when_there_is_almost_nothing_to_match_on()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("a", 10, Ct);

        // *"a"* matches most of the catalogue, so the ten most-rated games containing an "a"
        // would come back for every one-letter search — noise, and a request nobody wanted.
        stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull().ShouldContain("search");
    }
    [Fact]
    public async Task Builds_a_by_id_query_body_for_the_backfill()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.GetGamesAsync([740, 741], Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Post);
        request.Uri!.AbsolutePath.ShouldBe("/v4/games");

        // A where clause, not a search: this asks for known ids, so there is no relevance
        // ranking to preserve and nothing for IGDB to guess at.
        request.Body.ShouldNotBeNull();
        request.Body.ShouldContain("where id = (740,741);");
        request.Body.ShouldNotContain("search");

        // The same fields as a search, so a refreshed row carries everything a searched one does.
        request.Body.ShouldContain("genres.name");
        request.Body.ShouldContain("cover.image_id");

        // Including the release window, which is what makes this the backfill for it and what
        // the daily refresh of not-yet-released titles rides on.
        request.Body.ShouldContain("release_dates.date_format.format");
        request.Body.ShouldContain("game_status.status");
    }

    [Fact]
    public async Task Leaves_mods_and_bundles_out_of_a_search()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("hollow knight", 10, Ct);

        // 5 is Mod and 3 is Bundle, read off /v4/game_types rather than assumed from the
        // deprecated `category` enum they used to share numbering with.
        //
        // In the query rather than over the results, because IGDB applies `where` before
        // `limit`: filtering afterwards would ask for ten and hand back six. Searching
        // "Hollow Knight" without this returns a mod of it above the game itself.
        SearchQuery(stub).Body.ShouldNotBeNull().ShouldContain("where game_type != (3,5);");
        SlugQuery(stub).Body.ShouldNotBeNull().ShouldContain("game_type != (3,5)");
    }

    [Fact]
    public async Task Leaves_the_backfill_able_to_refresh_anything_already_logged()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.GetGamesAsync([365702], Ct);

        // The search filter deliberately does not reach here. These ids are already on
        // somebody's board, and a mod logged before the filter existed would otherwise stop
        // being refreshed — keeping whatever IGDB said about it the day it was added, for
        // ever, with nothing anywhere reporting that it had been skipped.
        stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull().ShouldNotContain("game_type");
    }
    [Fact]
    public async Task Asks_igdb_nothing_when_there_are_no_ids_to_refresh()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        (await client.GetGamesAsync([], Ct)).ShouldBeEmpty();

        // `where id = ();` is a parse error, and asking a service that never agreed to serve us
        // for nothing at all is rude twice over.
        stub.Requests.ShouldBeEmpty();
    }

    [Theory]
    [InlineData("hal\"o", "search \"halo\";")]
    [InlineData("hal\\o", "search \"halo\";")]
    [InlineData("  halo  ", "search \"halo\";")]
    public async Task Strips_characters_that_would_break_out_of_the_search_clause(
        string search, string expected)
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync(search, 10, Ct);

        // APIcalypse delimits the term with double quotes and defines no escape sequence, so a
        // quote in user input would end the clause early and leave the rest to be parsed as
        // query syntax.
        SearchQuery(stub).Body.ShouldNotBeNull().ShouldContain(expected);
    }

    [Fact]
    public async Task Parses_igdbs_snake_case_json()
    {
        const string body = """
            [
              {
                "id": 740,
                "name": "Halo: Combat Evolved",
                "cover": { "id": 1, "image_id": "co2r2r" },
                "platforms": [ { "id": 11, "name": "Xbox" }, { "id": 6, "name": "PC (Microsoft Windows)" } ],
                "genres": [ { "id": 5, "name": "Shooter" }, { "id": 31, "name": "Adventure" } ],
                "involved_companies": [
                  { "id": 1, "developer": true,  "company": { "id": 5, "name": "Bungie" } },
                  { "id": 2, "developer": false, "company": { "id": 9, "name": "Microsoft Game Studios" } }
                ]
              }
            ]
            """;

        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body));

        var games = await client.SearchGamesAsync("halo", 10, Ct);

        var game = games.ShouldHaveSingleItem();
        game.Id.ShouldBe(740);
        game.Name.ShouldBe("Halo: Combat Evolved");

        // The naming policy is what turns image_id into ImageId and involved_companies into
        // InvolvedCompanies. Without it these silently deserialize as null.
        game.Cover!.ImageId.ShouldBe("co2r2r");
        game.Platforms!.Select(p => p.Name).ShouldBe(["Xbox", "PC (Microsoft Windows)"]);
        game.Genres!.Select(g => g.Name).ShouldBe(["Shooter", "Adventure"]);
        game.InvolvedCompanies!.Count.ShouldBe(2);
        game.InvolvedCompanies.Single(c => c.Developer).Company!.Name.ShouldBe("Bungie");
    }

    [Fact]
    public async Task Returns_empty_when_igdb_finds_nothing()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "[]"));

        var games = await client.SearchGamesAsync("zzzznotarealgame", 10, Ct);

        games.ShouldBeEmpty();
    }

    [Fact]
    public async Task Surfaces_igdb_errors_with_their_body()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(
            HttpStatusCode.BadRequest, "Invalid field name: cover.imgae_id"));

        var exception = await Should.ThrowAsync<IgdbException>(
            () => client.SearchGamesAsync("halo", 10, Ct));

        // IGDB puts APIcalypse parse errors in the body, and they are by far the most useful
        // thing to see while iterating on a query.
        exception.Message.ShouldContain("400");
        exception.Message.ShouldContain("Invalid field name");
    }

    [Fact]
    public async Task Names_the_rate_limit_explicitly()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        var exception = await Should.ThrowAsync<IgdbException>(
            () => client.SearchGamesAsync("halo", 10, Ct));

        exception.Message.ShouldContain("rate limit");
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "not json at all"));

        // A raw JsonException escaping here would surface as a 500; IgdbException makes it a 502.
        await Should.ThrowAsync<IgdbException>(() => client.SearchGamesAsync("halo", 10, Ct));
    }

    // ------------------------------------------------------------------------------ discovery
    //
    // The four lists the Discover page draws: what IGDB would show somebody who has not typed
    // anything. Every query shape below was measured against the live API on 23 September 2026
    // before it was written down here.

    private static readonly DateTimeOffset Now = new(2026, 9, 23, 16, 0, 0, TimeSpan.Zero);

    /// <summary>Answers PopScore's question with a ranking, and /games with a list of games.</summary>
    private static StubHttpMessageHandler PopScoreAnswering(string ranking, string games = "[]") =>
        new((request, _) => StubHttpMessageHandler.Respond(
            HttpStatusCode.OK,
            request.Uri!.AbsolutePath == "/v4/popularity_primitives" ? ranking : games));

    /// <summary>One discovery question by the name a theory can carry, from a place a page might start.</summary>
    private static Task<IgdbSlice> DiscoverAsync(IgdbClient client, string list, int offset = 0) =>
        list switch
        {
            "new" => client.GetNewReleasesAsync(Now.AddDays(-60), Now, offset, 49, Ct),
            "anticipated" => client.GetAnticipatedAsync(Now, offset, 96, Ct),
            "most" => client.GetMostRatedAsync(offset, 49, Ct),
            "popular" => client.GetPlayingNowAsync(offset, 96, Ct),
            _ => throw new ArgumentOutOfRangeException(nameof(list), list, null),
        };

    [Fact]
    public async Task Asks_for_new_releases_the_most_anticipated_first()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await CreateClient(stub).GetNewReleasesAsync(Now.AddDays(-60), Now, 0, 49, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Uri!.AbsolutePath.ShouldBe("/v4/games");

        var body = request.Body.ShouldNotBeNull();
        body.ShouldContain(
            $"first_release_date >= {Now.AddDays(-60).ToUnixTimeSeconds()} " +
            $"& first_release_date <= {Now.ToUnixTimeSeconds()}");

        // Hype rather than ratings, because a game out for a fortnight has hardly been rated.
        // Sorted by ratings, Valheim's 1.0 came first on 301 carried over from early access,
        // and nothing after it had more than 36.
        body.ShouldContain("sort hypes desc;");
        body.ShouldContain("limit 49;");

        // The same fields a search asks for, because the rows go through the same upsert.
        body.ShouldContain("cover.image_id");
        body.ShouldContain("release_dates.date_format.format");
    }

    [Fact]
    public async Task Ends_new_releases_where_the_hype_does()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await CreateClient(stub).GetNewReleasesAsync(Now.AddDays(-60), Now, 0, 49, Ct);

        // Measured on 24 September 2026: 3,344 games came out in the window and 552 had any hype.
        // The list is sorted by hype, so past the 552nd it is sorting nothing — 2,800 titles tied
        // at none, in whatever order IGDB keeps them, and a Load more there would page through an
        // arbitrary slice of everything released in two months. Page one's lowest hype was 11, so
        // this changes where the list ends and nothing about how it starts.
        stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull().ShouldContain("hypes != null");
    }

    [Theory]
    [InlineData("new")]
    [InlineData("anticipated")]
    [InlineData("most")]
    public async Task Asks_a_list_from_the_place_its_page_starts(string list)
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await DiscoverAsync(CreateClient(stub), list, offset: 53);

        // APIcalypse applies where, then sort, then offset and limit — so this is place 53 of the
        // filtered ordering, which is exactly the place the page before this one said to start at.
        stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull().ShouldContain("offset 53;");
    }

    [Fact]
    public async Task Numbers_each_game_by_its_place_in_the_ordering()
    {
        var stub = StubHttpMessageHandler.Always(
            HttpStatusCode.OK, """[{ "id": 7, "name": "Seven" }, { "id": 3, "name": "Three" }]""");

        var slice = await CreateClient(stub).GetMostRatedAsync(96, 49, Ct);

        // The filter is inside the question, so what comes back is consecutive places from the offset.
        slice.Games.Select(ranked => (ranked.Place, ranked.Game.Id)).ShouldBe([(96, 7), (97, 3)]);

        // Two places of the 49 asked about, so the ordering ends here and there is no page after it.
        slice.Ended.ShouldBeTrue();
    }

    [Fact]
    public async Task Says_the_ordering_goes_on_when_every_place_asked_about_was_filled()
    {
        var stub = StubHttpMessageHandler.Always(
            HttpStatusCode.OK, """[{ "id": 1, "name": "One" }, { "id": 2, "name": "Two" }]""");

        var slice = await CreateClient(stub).GetMostRatedAsync(0, 2, Ct);

        slice.Ended.ShouldBeFalse();
    }

    [Fact]
    public async Task Asks_for_what_is_not_out_yet_the_most_anticipated_first()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await CreateClient(stub).GetAnticipatedAsync(Now, 0, 96, Ct);

        var body = stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull();

        // Undated counts as not out. The Elder Scrolls VI, second on the list, has no
        // first_release_date at all.
        body.ShouldContain($"(first_release_date > {Now.ToUnixTimeSeconds()} | first_release_date = null)");

        // Somebody has to be waiting for it. Without this, "not out" is the 53,096 undated main
        // games docs/games-igdb.md counted, which is mostly nothing.
        body.ShouldContain("hypes != null");
        body.ShouldContain("sort hypes desc;");
        body.ShouldContain("limit 96;");
    }

    [Fact]
    public async Task Asks_for_the_games_the_most_people_have_rated()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await CreateClient(stub).GetMostRatedAsync(0, 49, Ct);

        var body = stub.Requests.ShouldHaveSingleItem().Body.ShouldNotBeNull();

        // PopScore has a Played list, and it holds the same games as this in 14 of its top 15.
        // This is one request with the filter inside it; that is two with the filter after.
        body.ShouldContain("total_rating_count != null");
        body.ShouldContain("sort total_rating_count desc;");
        body.ShouldContain("limit 49;");
    }

    [Fact]
    public async Task Asks_popscore_what_people_are_playing_and_then_asks_for_those_games()
    {
        var stub = PopScoreAnswering("""[{ "game_id": 11, "value": 0.009 }, { "game_id": 22, "value": 0.007 }]""");

        await CreateClient(stub).GetPlayingNowAsync(96, 96, Ct);

        stub.Requests.Count.ShouldBe(2);

        var ranking = stub.Requests[0];
        ranking.Uri!.AbsolutePath.ShouldBe("/v4/popularity_primitives");

        // 3 is Playing, read off /v4/popularity_types; IGDB's own documentation lists the same
        // ids. A ranking row carries nothing but a game id, which is why a second question follows.
        //
        // The page's place goes on the ranking, because that is the ordering being paged. The
        // second question names its games by id and has nothing to skip.
        var body = ranking.Body.ShouldNotBeNull();
        body.ShouldContain("where popularity_type = 3;");
        body.ShouldContain("sort value desc;");
        body.ShouldContain("limit 96;");
        body.ShouldContain("offset 96;");

        var games = stub.Requests[1];
        games.Uri!.AbsolutePath.ShouldBe("/v4/games");
        games.Body.ShouldNotBeNull().ShouldContain("where id = (11,22)");
        games.Body.ShouldNotContain("offset");
    }

    [Fact]
    public async Task Reads_a_popscore_list_in_its_own_order()
    {
        // PopScore ranks, and /games answers in whatever order it likes — here, id order. The
        // ranking is the whole point of the list, so it is PopScore's order that comes back.
        var stub = PopScoreAnswering(
            """[{ "game_id": 30, "value": 0.9 }, { "game_id": 10, "value": 0.5 }, { "game_id": 20, "value": 0.1 }]""",
            """[{ "id": 10, "name": "Ten" }, { "id": 20, "name": "Twenty" }, { "id": 30, "name": "Thirty" }]""");

        var slice = await CreateClient(stub).GetPlayingNowAsync(0, 96, Ct);

        slice.Games.Select(ranked => ranked.Game.Id).ShouldBe([30, 10, 20]);
    }

    [Fact]
    public async Task Keeps_a_popscore_place_when_the_second_question_declines_its_game()
    {
        // Ranked 49th, 50th and 51st; /games will not describe 10 — a bundle, say, or a title the
        // Discover filter keeps off. The game after it is still 51st. Numbered by what came back
        // instead, it would be 50th, and the next page would start a place too early and show it twice.
        var stub = PopScoreAnswering(
            """[{ "game_id": 30, "value": 0.9 }, { "game_id": 10, "value": 0.5 }, { "game_id": 20, "value": 0.1 }]""",
            """[{ "id": 20, "name": "Twenty" }, { "id": 30, "name": "Thirty" }]""");

        var slice = await CreateClient(stub).GetPlayingNowAsync(48, 3, Ct);

        slice.Games.Select(ranked => (ranked.Place, ranked.Game.Id)).ShouldBe([(48, 30), (50, 20)]);

        // Every place asked about was ranked, so PopScore may well go on past them.
        slice.Ended.ShouldBeFalse();
    }

    [Fact]
    public async Task Asks_nothing_more_when_popscore_has_nothing()
    {
        var stub = PopScoreAnswering("[]");

        var slice = await CreateClient(stub).GetPlayingNowAsync(0, 96, Ct);
        slice.Games.ShouldBeEmpty();
        slice.Ended.ShouldBeTrue();

        // `where id = ()` is an APIcalypse syntax error, found by sending one, so an empty
        // ranking has to end here rather than ask the second question.
        stub.Requests.ShouldHaveSingleItem().Uri!.AbsolutePath.ShouldBe("/v4/popularity_primitives");
    }

    [Theory]
    [InlineData("new")]
    [InlineData("anticipated")]
    [InlineData("most")]
    [InlineData("popular")]
    public async Task Keeps_erotic_titles_off_every_discover_list(string list)
    {
        var stub = PopScoreAnswering("""[{ "game_id": 11, "value": 0.5 }]""");

        await DiscoverAsync(CreateClient(stub), list);

        var body = stub.Requests
            .Single(request => request.Uri!.AbsolutePath == "/v4/games")
            .Body.ShouldNotBeNull();

        // 42 is Erotic on /v4/themes. 11 of PopScore's top 60 Visits carried it, and one sat in
        // the top 40 of the most-hyped titles not yet out: a page nobody typed into cannot show
        // what it finds. A game with no themes at all still passes — one was measured doing so.
        body.ShouldContain("themes != (42)");
    }

    [Theory]
    [InlineData("new")]
    [InlineData("anticipated")]
    [InlineData("most")]
    [InlineData("popular")]
    public async Task Keeps_add_ons_off_every_discover_list(string list)
    {
        var stub = PopScoreAnswering("""[{ "game_id": 11, "value": 0.5 }]""");

        await DiscoverAsync(CreateClient(stub), list);

        var body = stub.Requests
            .Single(request => request.Uri!.AbsolutePath == "/v4/games")
            .Body.ShouldNotBeNull();

        // Search's bundles and mods, and then DLC (1), Season (7) and Update (14), read off
        // /v4/game_types on 24 September 2026. None appeared in the top 60 of any list, which is as
        // far as the first measurement went; Load more goes further, and 8 of New releases' first
        // 500 were one of the three — Medieval Dynasty: Hunting Pack, Core Keeper: Riders of the
        // Underground — from page three on. A wall is for finding games to play.
        body.ShouldContain("game_type != (1,3,5,7,14)");
    }

    [Fact]
    public async Task Leaves_a_search_to_find_whatever_was_asked_for()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);

        await CreateClient(stub).SearchGamesAsync("hollow knight", 10, Ct);

        // The erotic filter is discovery's alone, and so is leaving off DLC, seasons and updates.
        // Somebody who typed a title asked for it — a person searching for Shadow of the Erdtree
        // wants the DLC — and the Discover page shows what nobody asked for. That is the whole
        // difference.
        stub.Requests.Count.ShouldBe(2);
        stub.Requests.ShouldAllBe(request => !request.Body!.Contains("themes"));
        stub.Requests.ShouldAllBe(request => request.Body!.Contains("game_type != (3,5)"));
    }

    [Fact]
    public async Task Names_the_endpoint_that_failed()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.BadRequest, "Invalid field name: popularity_typ");

        var exception = await Should.ThrowAsync<IgdbException>(
            () => CreateClient(stub).GetPlayingNowAsync(0, 96, Ct));

        // There are two endpoints now, and a parse error is only useful if it says which query
        // it came from.
        exception.Message.ShouldContain("/popularity_primitives");
        exception.Message.ShouldContain("Invalid field name");
    }

    private static IgdbClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.igdb.com/v4/") },
            NullLogger<IgdbClient>.Instance);
}
