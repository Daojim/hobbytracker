using System.Net.Http;
using HobbyTracker.Api.Integrations.Wikidata;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Wikidata's query service, with no network and no container.
///
/// <b>Why it is here at all.</b> IGDB links neither OpenCritic nor Metacritic, and OpenCritic's own
/// search would mean matching names, with 25 searches a day to do it in. Wikidata files IGDB's id
/// (P5794, the slug) and OpenCritic's (P2864) on the same item, so one keyless question finds an
/// OpenCritic id with no matching at all: 61 of the user's 91 titles, measured on 12 November 2026.
/// </summary>
public sealed class WikidataClientTests
{
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    /// <summary>NieR: Automata, as Wikidata answered it: three OpenCritic ids, the game and two editions.</summary>
    private const string NierAutomata = """
        { "head" : { "vars" : [ "oc" ] }, "results" : { "bindings" : [
          { "oc" : { "type" : "literal", "value" : "6310" } },
          { "oc" : { "type" : "literal", "value" : "7334" } },
          { "oc" : { "type" : "literal", "value" : "3540" } } ] } }
        """;

    [Fact]
    public async Task Asks_one_question_from_igdbs_slug_to_opencritics_ids()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, NierAutomata);

        await CreateClient(stub).GetOpenCriticIdsAsync("nier-automata", Ct);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Method.ShouldBe(HttpMethod.Post);
        request.Uri!.AbsolutePath.ShouldBe("/sparql");
        request.Header("Accept").ShouldBe("application/sparql-results+json");

        // A form, as the service takes one, with the question in `query`: the items that carry
        // IGDB's slug, and the OpenCritic ids those items carry.
        var query = QueryOf(request);
        query.ShouldContain("""wdt:P5794 "nier-automata" .""");
        query.ShouldContain("wdt:P2864");
    }

    [Fact]
    public async Task Names_the_app_it_asks_for()
    {
        // Wikimedia asks every program that reads its query service to say what it is, and
        // throttles the ones that do not. A default HttpClient says nothing at all.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, NierAutomata);

        await CreateClient(stub).GetOpenCriticIdsAsync("nier-automata", Ct);

        // A User-Agent is a list of products and comments, each a value of its own, and the wire
        // carries them separated by spaces. The stub's Header() joins with commas, so not that.
        string.Join(' ', stub.Requests.ShouldHaveSingleItem().Headers["User-Agent"])
            .ShouldBe("HobbyTracker/1.0 (a test)");
    }

    [Fact]
    public async Task Reads_every_opencritic_id_the_items_carry()
    {
        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, NierAutomata))
            .GetOpenCriticIdsAsync("nier-automata", Ct);

        found.ShouldBe([6310, 7334, 3540], ignoreOrder: true);
    }

    [Fact]
    public async Task Reads_one_id_once_however_many_items_carry_it()
    {
        // Two items can carry one slug — a game and an edition both filed under it — and name the
        // same OpenCritic page. That is one id, not two to choose between.
        const string body = """
            { "results" : { "bindings" : [
              { "oc" : { "type" : "literal", "value" : "15125" } },
              { "oc" : { "type" : "literal", "value" : "15125" } } ] } }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetOpenCriticIdsAsync("armored-core-vi-fires-of-rubicon", Ct);

        found.ShouldBe([15125]);
    }

    [Fact]
    public async Task Answers_nothing_for_a_slug_wikidata_ties_to_nothing()
    {
        // The common case, a third of a real board: not out yet, out before OpenCritic, or a later
        // version Wikidata files under its original.
        const string body = """{ "head" : { "vars" : [ "oc" ] }, "results" : { "bindings" : [ ] } }""";

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetOpenCriticIdsAsync("paper-mario-the-thousand-year-door--1", Ct);

        found.ShouldBeEmpty();
    }

    [Fact]
    public async Task Leaves_out_a_value_that_is_not_a_number()
    {
        // OpenCritic's ids are numbers and the link is built from one. Anything else in the property
        // is a mistake on Wikidata's side, and a link built from it would go nowhere.
        const string body = """
            { "results" : { "bindings" : [
              { "oc" : { "type" : "literal", "value" : "game/3540/nier-automata" } },
              { "oc" : { "type" : "literal", "value" : "3540" } } ] } }
            """;

        var found = await CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, body))
            .GetOpenCriticIdsAsync("nier-automata", Ct);

        found.ShouldBe([3540]);
    }

    [Fact]
    public async Task Escapes_the_slug_so_it_cannot_end_the_question()
    {
        // IGDB's slugs are letters, digits and hyphens, but the question is a string written into
        // SPARQL, and a quote in it would close the literal and let the rest be read as query.
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK, """{"results":{"bindings":[]}}""");

        await CreateClient(stub).GetOpenCriticIdsAsync("""a"b\c""", Ct);

        // Raw strings, so the backslashes below are the characters sent: a quote and a backslash,
        // each escaped the way SPARQL escapes them.
        QueryOf(stub.Requests.ShouldHaveSingleItem()).ShouldContain("""wdt:P5794 "a\"b\\c" .""");
    }

    [Fact]
    public async Task A_rate_limit_is_the_provider_unhappy()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.TooManyRequests));

        await Should.ThrowAsync<WikidataException>(() => client.GetOpenCriticIdsAsync("nier-automata", Ct));
    }

    [Fact]
    public async Task A_failure_is_the_provider_unhappy()
    {
        // The query service answers a question it cannot finish in time with a 500 and a Java
        // stack, which is a failure to ask again later rather than an answer of nothing.
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.InternalServerError, "timeout"));

        await Should.ThrowAsync<WikidataException>(() => client.GetOpenCriticIdsAsync("nier-automata", Ct));
    }

    [Fact]
    public async Task Wraps_unparseable_responses()
    {
        var client = CreateClient(StubHttpMessageHandler.Always(HttpStatusCode.OK, "<html>not json</html>"));

        await Should.ThrowAsync<WikidataException>(() => client.GetOpenCriticIdsAsync("nier-automata", Ct));
    }

    [Fact]
    public async Task Wraps_a_provider_that_cannot_be_reached()
    {
        var client = CreateClient(
            new StubHttpMessageHandler((_, _) => throw new HttpRequestException("unreachable")));

        await Should.ThrowAsync<WikidataException>(() => client.GetOpenCriticIdsAsync("nier-automata", Ct));
    }

    /// <summary>The SPARQL, out of the form it was posted in.</summary>
    private static string QueryOf(RecordedRequest request)
    {
        var form = request.Body!.Split('&');
        var query = form.Single(pair => pair.StartsWith("query=", StringComparison.Ordinal));

        // A form encodes a space as '+', which UnescapeDataString leaves alone.
        return Uri.UnescapeDataString(query["query=".Length..].Replace('+', ' '));
    }

    private static WikidataClient CreateClient(StubHttpMessageHandler stub) =>
        new(new HttpClient(stub),
            Options.Create(new WikidataOptions
            {
                Endpoint = "https://query.wikidata.org/sparql",
                UserAgent = "HobbyTracker/1.0 (a test)",
            }),
            NullLogger<WikidataClient>.Instance);
}
