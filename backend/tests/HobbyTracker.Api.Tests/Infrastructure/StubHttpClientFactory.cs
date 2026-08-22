namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Hands every named client the same stub handler.
///
/// Exists because the components that cache something across requests — TwitchTokenProvider,
/// HltbSession — are singletons and so resolve clients from a factory per call rather than
/// holding one. Testing them means being that factory.
/// </summary>
public sealed class StubHttpClientFactory(HttpMessageHandler handler, Uri baseAddress)
    : IHttpClientFactory
{
    public HttpClient CreateClient(string name) =>
        new(handler, disposeHandler: false) { BaseAddress = baseAddress };
}
