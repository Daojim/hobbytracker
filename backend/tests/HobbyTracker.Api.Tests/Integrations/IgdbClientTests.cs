using HobbyTracker.Api.Integrations.Igdb;
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

    [Fact]
    public async Task Builds_an_apicalypse_query_body()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        var client = CreateClient(stub);

        await client.SearchGamesAsync("halo", 5, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();

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
        stub.Requests.Single().Body.ShouldNotBeNull().ShouldContain(expected);
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
