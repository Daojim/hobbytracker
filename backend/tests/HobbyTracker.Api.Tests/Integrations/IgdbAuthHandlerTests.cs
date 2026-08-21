using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Integrations;

/// <summary>
/// Covers the recovery path the IGDB work shipped unverified: a token that dies earlier than
/// Twitch advertised. Forcing a genuine 401 out of IGDB is not something a test can arrange,
/// which is exactly why it needs a stubbed transport.
/// </summary>
public sealed class IgdbAuthHandlerTests
{
    [Fact]
    public async Task Stamps_both_igdb_auth_headers()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.OK);
        using var client = CreateClient(stub, out _);

        await client.PostAsync("games", new StringContent("fields id;"), TestContext.Current.CancellationToken);

        var request = stub.Requests.ShouldHaveSingleItem();
        request.Header("Client-ID").ShouldBe("test-client-id");
        request.Header("Authorization").ShouldBe("Bearer token-1");
    }

    [Fact]
    public async Task Refreshes_and_replays_once_on_401()
    {
        var stub = StubHttpMessageHandler.Sequence(
            (HttpStatusCode.Unauthorized, "expired"),
            (HttpStatusCode.OK, "[{\"id\":1}]"));

        using var client = CreateClient(stub, out var tokens);

        var response = await client.PostAsync(
            "games", new StringContent("fields id;"), TestContext.Current.CancellationToken);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // The caller sees success, having never learned that the first attempt failed.
        stub.Requests.Count.ShouldBe(2);
        tokens.InvalidateCount.ShouldBe(1);

        // The replay must carry the *new* token; retrying with the dead one would just 401 again.
        stub.Requests[0].Header("Authorization").ShouldBe("Bearer token-1");
        stub.Requests[1].Header("Authorization").ShouldBe("Bearer token-2");
    }

    [Fact]
    public async Task Replayed_request_keeps_its_body()
    {
        var stub = StubHttpMessageHandler.Sequence(
            (HttpStatusCode.Unauthorized, "expired"),
            (HttpStatusCode.OK, "[]"));

        using var client = CreateClient(stub, out _);

        await client.PostAsync(
            "games", new StringContent("search \"halo\";"), TestContext.Current.CancellationToken);

        // An HttpRequestMessage cannot be sent twice, so the handler clones it up front. If that
        // buffering regressed, the retry would go out with an empty body and IGDB would answer
        // with a parse error rather than results -- a bug that looks like bad query building.
        stub.Requests[1].Body.ShouldBe("search \"halo\";");
    }

    [Fact]
    public async Task Gives_up_after_one_retry()
    {
        var stub = StubHttpMessageHandler.Always(HttpStatusCode.Unauthorized, "still bad");
        using var client = CreateClient(stub, out var tokens);

        var response = await client.PostAsync(
            "games", new StringContent("fields id;"), TestContext.Current.CancellationToken);

        // A second 401 means the credentials are wrong, not that the token went stale.
        // Retrying past that turns a clear error into a hang.
        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        stub.Requests.Count.ShouldBe(2);
        tokens.InvalidateCount.ShouldBe(1);
    }

    private static HttpClient CreateClient(StubHttpMessageHandler stub, out FakeTokenProvider tokens)
    {
        tokens = new FakeTokenProvider();

        var options = Options.Create(new IgdbOptions
        {
            ClientId = "test-client-id",
            ClientSecret = "test-client-secret",
        });

        var handler = new IgdbAuthHandler(tokens, options, NullLogger<IgdbAuthHandler>.Instance)
        {
            InnerHandler = stub,
        };

        return new HttpClient(handler) { BaseAddress = new Uri("https://api.igdb.com/v4/") };
    }

    /// <summary>Hands out a new token each time, so a replay is visibly distinguishable.</summary>
    private sealed class FakeTokenProvider : IIgdbTokenProvider
    {
        private int _issued;

        public int InvalidateCount { get; private set; }

        public Task<string> GetAccessTokenAsync(CancellationToken cancellationToken) =>
            Task.FromResult($"token-{++_issued}");

        public void Invalidate() => InvalidateCount++;
    }
}
