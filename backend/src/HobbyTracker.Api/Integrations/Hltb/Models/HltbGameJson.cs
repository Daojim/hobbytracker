using System.Text.Json;
using System.Text.Json.Serialization;

namespace HobbyTracker.Api.Integrations.Hltb.Models;

/// <summary>What a search answers with.</summary>
public sealed class HltbSearchResponse
{
    public int Count { get; set; }
    public List<HltbGameJson>? Data { get; set; }
}

/// <summary>
/// One game as HowLongToBeat returns it — from a search, and from the JSON embedded in a game
/// page, which happen to agree on almost everything.
///
/// This type mirrors the wire and stops at the edge of this folder. The three quirks it exists
/// to absorb are worth naming: the times are in seconds, a nought means nobody has submitted one
/// rather than that the game takes no time, and release_world is an integer year from the search
/// endpoint but a date string from the page. Nothing above the integration layer should have to
/// know any of that, which is why the client hands out <see cref="HltbGame"/> instead.
/// </summary>
public sealed class HltbGameJson
{
    public int GameId { get; set; }
    public string? GameName { get; set; }

    /// <summary>Other names for the same game, comma-separated in one string.</summary>
    public string? GameAlias { get; set; }

    public string? GameType { get; set; }

    /// <summary>
    /// An integer year from the search endpoint and a date string from the game page. Left as a
    /// JsonElement because it is genuinely two shapes on the wire — typing it as int? makes the
    /// page throw, and typing it as string? makes the search throw.
    /// </summary>
    public JsonElement? ReleaseWorld { get; set; }

    public int CompMain { get; set; }
    public int CompPlus { get; set; }

    /// <summary>
    /// The one property the snake_case policy cannot derive: it would spell Comp100 as
    /// "comp100", where HowLongToBeat writes "comp_100".
    /// </summary>
    [JsonPropertyName("comp_100")]
    public int Comp100 { get; set; }

    public int CompMainCount { get; set; }
    public int CompPlusCount { get; set; }

    [JsonPropertyName("comp_100_count")]
    public int Comp100Count { get; set; }
}
