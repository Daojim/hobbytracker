namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>A request as the stub saw it, captured before the message is disposed.</summary>
public sealed record RecordedRequest(
    HttpMethod Method,
    Uri? Uri,
    IReadOnlyDictionary<string, string[]> Headers,
    string? Body)
{
    public string? Header(string name) =>
        Headers.TryGetValue(name, out var values) ? string.Join(",", values) : null;
}

/// <summary>
/// Terminates an HttpClient pipeline with canned responses, so the IGDB client and its auth
/// handler can be tested without a network or a container.
/// </summary>
public sealed class StubHttpMessageHandler(
    Func<RecordedRequest, int, HttpResponseMessage> respond) : HttpMessageHandler
{
    private readonly List<RecordedRequest> _requests = [];

    public IReadOnlyList<RecordedRequest> Requests => _requests;

    /// <summary>Always answers with the same status and body.</summary>
    public static StubHttpMessageHandler Always(HttpStatusCode status, string body = "[]") =>
        new((_, _) => Respond(status, body));

    /// <summary>Answers with each response in turn, one per request.</summary>
    public static StubHttpMessageHandler Sequence(params (HttpStatusCode Status, string Body)[] responses) =>
        new((_, index) => index < responses.Length
            ? Respond(responses[index].Status, responses[index].Body)
            : Respond(HttpStatusCode.InternalServerError, "stub ran out of responses"));

    public static HttpResponseMessage Respond(HttpStatusCode status, string body) =>
        new(status) { Content = new StringContent(body, Encoding.UTF8, "application/json") };

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request, CancellationToken cancellationToken)
    {
        // Snapshot now: the pipeline disposes the request (and its content) after this returns,
        // so anything read later would be gone.
        var body = request.Content is null
            ? null
            : await request.Content.ReadAsStringAsync(cancellationToken);

        var headers = request.Headers.ToDictionary(
            header => header.Key,
            header => header.Value.ToArray(),
            StringComparer.OrdinalIgnoreCase);

        var recorded = new RecordedRequest(request.Method, request.RequestUri, headers, body);
        _requests.Add(recorded);

        return respond(recorded, _requests.Count - 1);
    }
}
