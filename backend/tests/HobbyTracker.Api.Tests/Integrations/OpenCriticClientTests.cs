using System.Net.Http;
using HobbyTracker.Api.Integrations.OpenCritic;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// OpenCritic's API, through RapidAPI, with no network and no container.
///
/// <b>The key is optional, and this is where that is held.</b> Without one the client says so and
/// sends nothing, so the app boots and the journal shows OpenCritic's link alone. The headers are
/// the client's own to stamp rather than the typed client's to carry, because whether there is a
/// key decides whether there is a request at all — so, unlike TMDB's bearer, they are asserted here.
///
/// The bodies are OpenCritic's own answers from 12 November 2026, cut to what is read.
/// </summary>
public sealed class OpenCriticClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private const string Key = "test-rapidapi-key";

    /// <summary>Armored Core VI, as OpenCritic answered it.</summary>
    private const string ArmoredCore = """
        {"id":15125,"name":"Armored Core VI: Fires of Rubicon","url":"https://opencritic.com/game/15125/armored-core-vi-fires-of-rubicon",
         "tier":"Mighty","topCriticScore":84.91176470588235,"percentRecommended":90.97222222222221,
         "numReviews":120,"numTopCriticReviews":91,"steamId":null,"firstReleaseDate":"2023-08-25T00:00:00.000Z"}
        """;

    [Fact]
    public async Task Asks_for_one_game_by_its_number_with_the_key_and_the_host()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore);

        await CreateClient(stub).GetGameAsync(15125, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Get);
        request.Uri!.AbsolutePath.ShouldBe("/game/15125");

        // RapidAPI's two headers: whose key, and which of its APIs the key is for.
        request.Header("X-RapidAPI-Key").ShouldBe(Key);
        request.Header("X-RapidAPI-Host").ShouldBe("opencritic-api.p.rapidapi.com");
    }

    [Fact]
    public async Task Reads_the_top_critics_score_the_tier_and_the_share_who_recommend_it()
    {
        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore))
            .GetGameAsync(15125, Ct);

        // Unrounded: how a score is written is the journal's business, and 84.9 is an 85 there.
        found.ShouldBe(new OpenCriticGame(
            15125, "Armored Core VI: Fires of Rubicon", 84.91176470588235, "Mighty", 90.97222222222221));
    }

    [Fact]
    public async Task Reads_minus_one_and_a_blank_tier_as_no_score()
    {
        // OpenCritic's "nothing yet" is -1 in both numbers and an empty tier: a game not out, and
        // Rabbit and Steel, out since May 2024 with three critic reviews. A -1 that reached the
        // journal would be a score of nought, rounded.
        const string body = """
            {"id":16687,"name":"Rabbit and Steel","tier":"","topCriticScore":-1,"percentRecommended":-1,
             "numReviews":2,"numTopCriticReviews":2}
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetGameAsync(16687, Ct);

        found.ShouldBe(new OpenCriticGame(16687, "Rabbit and Steel", null, null, null));
    }

    [Fact]
    public async Task Keeps_a_score_that_has_no_share_recommending_it()
    {
        // The two halves are independent: Kuro no Kiseki has a score from three top critics and too
        // few reviews for a share. Taking -1 in one as -1 in both would drop a real score.
        const string body = """
            {"id":12700,"name":"The Legend of Heroes: Kuro no Kiseki","tier":"Mighty",
             "topCriticScore":83.66666666666667,"percentRecommended":-1,"numTopCriticReviews":3}
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetGameAsync(12700, Ct);

        found.ShouldBe(new OpenCriticGame(
            12700, "The Legend of Heroes: Kuro no Kiseki", 83.66666666666667, "Mighty", null));
    }

    [Fact]
    public async Task Answers_null_for_a_number_opencritic_does_not_know()
    {
        // A 400, and that is what OpenCritic answers for an id it does not have — measured on
        // 12 November 2026 with this exact body. An answer, not a failure: a pin says it in words.
        var client = CreateClient(StubHttpMessageHandler.Always(
            HttpStatusCode.BadRequest, """{"message":"An unknown error has occurred"}"""));

        (await client.GetGameAsync(99_999_999, Ct)).ShouldBeNull();
    }

    [Fact]
    public async Task Answers_null_for_a_404_too()
    {
        // Not what it answers today, but what the next version of it plainly might, and a 404 can
        // mean nothing else.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.NotFound));

        (await client.GetGameAsync(99_999_999, Ct)).ShouldBeNull();
    }

    [Fact]
    public void Says_it_has_a_key_when_it_has_one()
    {
        CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore)).HasKey.ShouldBeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Without_a_key_says_so_and_sends_nothing(string? key)
    {
        // The optional option. Nothing refuses to boot, nothing is asked, and nothing is answered as
        // though OpenCritic had said it: a caller that asks anyway has forgotten to check, and is told.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore);
        var client = CreateClient(stub, key);

        client.HasKey.ShouldBeFalse();
        await Should.ThrowAsync<InvalidOperationException>(() => client.GetGameAsync(15125, Ct));
        stub.Requests.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_refused_key_is_the_provider_unhappy_and_not_an_unknown_game()
    {
        // The one to keep apart from the 400 above. A key RapidAPI will not take answers 403, and
        // reading that as "no such game" would have a pin refuse every number in words.
        var client = CreateClient(StubHttpMessageHandler.Always(
            HttpStatusCode.Forbidden, """{"message":"You are not subscribed to this API."}"""));

        await Should.ThrowAsync<OpenCriticException>(() => client.GetGameAsync(15125, Ct));
    }

    [Fact]
    public async Task A_spent_allowance_is_the_provider_unhappy()
    {
        // 200 requests a day on the free plan, and RapidAPI answers the 201st with a 429.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        var exception = await Should.ThrowAsync<OpenCriticException>(() => client.GetGameAsync(15125, Ct));

        exception.Message.ShouldContain("allowance");
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "not json at all"));

        await Should.ThrowAsync<OpenCriticException>(() => client.GetGameAsync(15125, Ct));
    }

    [Fact]
    public async Task Wraps_a_provider_that_cannot_be_reached()
    {
        var client = CreateClient(
            new StubHttpMessageHandler((_, _) => throw new HttpRequestException("unreachable")));

        await Should.ThrowAsync<OpenCriticException>(() => client.GetGameAsync(15125, Ct));
    }

    private static OpenCriticClient CreateClient(StubHttpMessageHandler stub, string? key = Key) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://opencritic-api.p.rapidapi.com/") },
            Options.Create(new OpenCriticOptions { ApiKey = key }),
            NullLogger<OpenCriticClient>.Instance);
}
