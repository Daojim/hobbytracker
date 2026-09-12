using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
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

    private static IgdbClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.igdb.com/v4/") },
            NullLogger<IgdbClient>.Instance);
}
