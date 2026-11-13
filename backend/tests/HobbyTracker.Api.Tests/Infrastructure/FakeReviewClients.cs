using HobbyTracker.Api.Integrations.OpenCritic;
using HobbyTracker.Api.Integrations.Steam;
using HobbyTracker.Api.Integrations.Wikidata;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Stands in for Steam, recording every app it was asked about. FakeMalClient's shape: canned
/// answers per id, a record of every call, and a hook to make the next one throw.
/// </summary>
public sealed class FakeSteamClient : ISteamClient
{
    /// <summary>Every app asked about, in order.</summary>
    public List<int> Lookups { get; } = [];

    /// <summary>What Steam says per app. An app absent from here is one Steam has nothing on.</summary>
    public Dictionary<int, SteamReviewSummary> ByApp { get; } = [];

    /// <summary>Set to make the next call throw, for the provider being unhappy.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<SteamReviewSummary?> GetReviewSummaryAsync(int appId, CancellationToken cancellationToken)
    {
        Lookups.Add(appId);

        // As a faulted task, the way the real client fails, rather than thrown before there is a
        // task at all: a fault that swallows a failed task would pass every test against a fake
        // that never hands one out. Planting exactly that, a cache keeping a failure, found it.
        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            return Task.FromException<SteamReviewSummary?>(exception);
        }

        return Task.FromResult(ByApp.GetValueOrDefault(appId));
    }
}

/// <summary>
/// Stands in for OpenCritic. <b>It has a key unless a test takes it away</b>, which is how the suite
/// runs both ways: the real client's key comes from configuration, and no test host sets one.
/// Without a key it refuses to be asked, as the real client does, so a service that forgot to check
/// fails loudly here rather than being handed an answer it could never have had.
/// </summary>
public sealed class FakeOpenCriticClient : IOpenCriticClient
{
    public bool HasKey { get; set; } = true;

    /// <summary>Every number asked about, in order.</summary>
    public List<int> Lookups { get; } = [];

    /// <summary>OpenCritic's games by number. A number absent from here is one OpenCritic does not know.</summary>
    public Dictionary<int, OpenCriticGame> ById { get; } = [];

    /// <summary>Set to make the next call throw, for the provider being unhappy.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<OpenCriticGame?> GetGameAsync(int id, CancellationToken cancellationToken)
    {
        // Each failure as a faulted task, the way the real client fails. See FakeSteamClient.
        if (!HasKey)
        {
            return Task.FromException<OpenCriticGame?>(
                new InvalidOperationException("OpenCritic has no key to ask with."));
        }

        Lookups.Add(id);

        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            return Task.FromException<OpenCriticGame?>(exception);
        }

        return Task.FromResult(ById.GetValueOrDefault(id));
    }

    /// <summary>One game, scored as OpenCritic scores: an unrounded average and a share.</summary>
    public void Add(int id, string name, double? score = null, string? tier = null, double? recommended = null) =>
        ById[id] = new OpenCriticGame(id, name, score, tier, recommended);
}

/// <summary>
/// Stands in for Wikidata's query service: OpenCritic's ids per IGDB slug.
/// </summary>
public sealed class FakeWikidataClient : IWikidataClient
{
    /// <summary>Every slug asked about, in order.</summary>
    public List<string> Lookups { get; } = [];

    /// <summary>OpenCritic's ids per IGDB slug. A slug absent from here is tied to none.</summary>
    public Dictionary<string, int[]> BySlug { get; } = new(StringComparer.Ordinal);

    /// <summary>Set to make the next call throw, for the provider being unhappy.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    /// <summary>
    /// Run as the next call starts, before it answers, so a test can do something while a look is
    /// in flight — a pin landing in the middle of one, say.
    /// </summary>
    public Func<Task>? WhileAsking { get; set; }

    public async Task<IReadOnlyList<int>> GetOpenCriticIdsAsync(
        string igdbSlug, CancellationToken cancellationToken)
    {
        Lookups.Add(igdbSlug);

        if (WhileAsking is { } meanwhile)
        {
            WhileAsking = null;
            await meanwhile();
        }

        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            throw exception;
        }

        return BySlug.TryGetValue(igdbSlug, out var ids) ? ids : [];
    }
}
