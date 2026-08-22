using HobbyTracker.Api.Integrations.Hltb;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Stands in for HowLongToBeat, recording what was asked of it.
///
/// The shape is FakeIgdbClient's — canned results, a record of every call, and a hook to make
/// the next one throw so the 502 path can be exercised. What it adds is the distinction the real
/// client draws between its two routes: a search that has to be matched, and a lookup by a
/// pinned id that must not be. Several tests turn entirely on which of the two was used.
/// </summary>
public sealed class FakeHltbClient : IHltbClient
{
    /// <summary>Every title searched for, in order.</summary>
    public List<string> Searches { get; } = [];

    /// <summary>Every id fetched directly — the pinned route, which never matches.</summary>
    public List<int> Lookups { get; } = [];

    public Dictionary<string, List<HltbGame>> Results { get; } =
        new(StringComparer.OrdinalIgnoreCase);

    public Dictionary<int, HltbGame> ById { get; } = [];

    /// <summary>Set to make the next call throw, for exercising the 502 path.</summary>
    public Exception? ThrowOnNextCall { get; set; }

    public Task<IReadOnlyList<HltbGame>> SearchAsync(
        string title, CancellationToken cancellationToken)
    {
        Searches.Add(title);
        ThrowIfAsked();

        return Task.FromResult<IReadOnlyList<HltbGame>>(
            Results.TryGetValue(title, out var found) ? found : []);
    }

    public Task<HltbGame?> GetAsync(int hltbId, CancellationToken cancellationToken)
    {
        Lookups.Add(hltbId);
        ThrowIfAsked();

        return Task.FromResult(ById.GetValueOrDefault(hltbId));
    }

    public void SetResults(string title, params HltbGame[] results) =>
        Results[title] = [.. results];

    /// <summary>Builds a game the way the real client hands one out: hours, not seconds.</summary>
    public static HltbGame Game(
        int id,
        string name,
        int? releaseYear = null,
        decimal? mainStory = null,
        decimal? mainExtra = null,
        decimal? completionist = null,
        string[]? aliases = null) =>
        new(id, name, aliases ?? [], releaseYear, mainStory, mainExtra, completionist);

    private void ThrowIfAsked()
    {
        if (ThrowOnNextCall is { } exception)
        {
            ThrowOnNextCall = null;
            throw exception;
        }
    }
}
