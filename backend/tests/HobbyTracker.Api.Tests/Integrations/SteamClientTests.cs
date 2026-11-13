using System.Net.Http;
using System.Text.Json;
using HobbyTracker.Api.Integrations.Steam;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Steam's review summary, with no network and no container.
///
/// <b>The route is <c>IUserReviewsService/GetAppReviews</c>, not the one the plan first named.</b>
/// <c>store.steampowered.com/appreviews/{appid}</c> is deprecated and answers every app with a 302 to
/// the store's home page, whatever it is asked; Steamworks' own page names this as its replacement.
/// Measured on 12 November 2026, keyless, over all 83 apps the user's board names. The bodies below
/// are what it answered, cut to what is read.
/// </summary>
public sealed class SteamClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>Armored Core VI, as Steam answered it: the summary, and the one review it was asked for.</summary>
    private const string ArmoredCore = """
        {"response":{"query_summary":{"num_reviews":1,"review_score":8,"review_score_desc":"Very Positive",
          "total_positive":38640,"total_negative":2643,"total_reviews":41283},
          "reviews":[{"recommendationid":"238723199","language":"english","review":"This is a solid game"}],
          "cursor":"AoJ4"}}
        """;

    [Fact]
    public async Task Asks_for_one_app_by_input_json_and_one_review_and_nothing_else()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore);

        await CreateClient(stub).GetReviewSummaryAsync(1888160, Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Get);
        request.Uri!.AbsolutePath.ShouldBe("/IUserReviewsService/GetAppReviews/v1/");

        // The question goes in input_json, which is how this service takes one, and it is the
        // app and a page of one review. The summary comes on the first page only, so one review is
        // the least that can be asked for and still get it.
        var input = JsonDocument.Parse(InputJsonOf(request)).RootElement;
        input.GetProperty("appid").GetInt32().ShouldBe(1888160);
        input.GetProperty("num_per_page").GetInt32().ShouldBe(1);

        // And no language, which is the point: Steam's default is the line the store page shows an
        // English reader. Every language counted 508,559 reviews of Hollow Knight where the page
        // said 186,389, and named a different verdict from the page for 8 of the board's games.
        input.EnumerateObject().Select(property => property.Name).ShouldBe(["appid", "num_per_page"], ignoreOrder: true);
    }

    [Fact]
    public async Task Reads_the_summary_alone()
    {
        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, ArmoredCore))
            .GetReviewSummaryAsync(1888160, Ct);

        found.ShouldBe(new SteamReviewSummary("Very Positive", 38640, 41283));
    }

    [Fact]
    public async Task Reads_a_game_nobody_has_reviewed_as_steams_own_words_for_it()
    {
        // What Steam answers for a game not out yet: a summary of nought, and its own words for
        // that, which the journal prints as they are. Persona 4 Revival, as measured.
        const string body = """
            {"response":{"query_summary":{"num_reviews":0,"review_score":0,"review_score_desc":"No user reviews",
              "total_positive":0,"total_negative":0,"total_reviews":0},"reviews":[],"cursor":"*"}}
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetReviewSummaryAsync(2963950, Ct);

        found.ShouldBe(new SteamReviewSummary("No user reviews", 0, 0));
    }

    [Fact]
    public async Task Answers_null_for_an_app_steam_has_nothing_to_say_about()
    {
        // An app Steam does not know is a 200 with an empty response, measured on an id far past
        // its numbering and on one delisted app the board names. An answer, not a failure: the
        // journal shows no verdict, where an exception would make it look like an outage.
        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"response":{}}"""))
            .GetReviewSummaryAsync(999_999_999, Ct);

        found.ShouldBeNull();
    }

    [Fact]
    public async Task A_rate_limit_is_the_provider_unhappy()
    {
        // Keyless answers share one rate limit with every other keyless caller, so a 429 says
        // something is wrong rather than merely busy, and saying so is more use than a retry here.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        var exception = await Should.ThrowAsync<SteamException>(() => client.GetReviewSummaryAsync(1888160, Ct));

        exception.Message.ShouldContain("rate limit");
    }

    [Fact]
    public async Task A_failure_is_the_provider_unhappy()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.InternalServerError, "oops"));

        await Should.ThrowAsync<SteamException>(() => client.GetReviewSummaryAsync(1888160, Ct));
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        // A raw JsonException escaping here would surface as a 500, which is "this API is broken".
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "not json at all"));

        await Should.ThrowAsync<SteamException>(() => client.GetReviewSummaryAsync(1888160, Ct));
    }

    [Fact]
    public async Task Wraps_a_provider_that_cannot_be_reached()
    {
        var client = CreateClient(
            new StubHttpMessageHandler((_, _) => throw new HttpRequestException("unreachable")));

        await Should.ThrowAsync<SteamException>(() => client.GetReviewSummaryAsync(1888160, Ct));
    }

    /// <summary>The question, out of the query string it travels in.</summary>
    private static string InputJsonOf(RecordedRequest request)
    {
        var query = request.Uri!.Query.TrimStart('?').Split('&');
        var input = query.Single(pair => pair.StartsWith("input_json=", StringComparison.Ordinal));
        return Uri.UnescapeDataString(input["input_json=".Length..]);
    }

    private static SteamClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub) { BaseAddress = new Uri("https://api.steampowered.com/") },
            NullLogger<SteamClient>.Instance);
}
