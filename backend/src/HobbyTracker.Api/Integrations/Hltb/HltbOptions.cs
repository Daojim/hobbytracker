using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Hltb;

/// <summary>
/// Everything about reaching HowLongToBeat that is worth changing without a deploy.
///
/// Every setting has a working default, deliberately: there are no secrets here — HLTB has no
/// account to hold one — so nothing has to be supplied for the app to boot, and the test host
/// does not need a Hltb section invented for it the way it needs Igdb credentials.
/// </summary>
public class HltbOptions
{
    public const string SectionName = "Hltb";

    /// <summary>Must keep the trailing slash, or relative request paths resolve one level too high.</summary>
    [Required(AllowEmptyStrings = false)]
    public string BaseUrl { get; set; } = "https://howlongtobeat.com/";

    /// <summary>
    /// Sent on every request, including the handshake.
    ///
    /// It has to be the same string in both places: the token the handshake hands back has the
    /// User-Agent baked into it, so a search sent under a different one is rejected. That is why
    /// this is one setting read by both the session and the client rather than a literal in each.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string UserAgent { get; set; } =
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
        + "Chrome/131.0.0.0 Safari/537.36";

    /// <summary>
    /// Where to look when the endpoint name cannot be scraped out of the site's JavaScript.
    ///
    /// The name has already changed twice — "s", then "seek", then "bleed" — so the next rename
    /// breaking the scrape is a matter of when. This is what lets that be corrected in
    /// configuration rather than in a release.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string FallbackSearchPath { get; set; } = "bleed";

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;

    /// <summary>
    /// The floor between one request and the next. HowLongToBeat publishes no rate limit, so
    /// this is politeness rather than compliance — and it is why the backfill is a queue drained
    /// in the background rather than something an HTTP request waits on.
    /// </summary>
    [Range(0, 3600)]
    public int MinSecondsBetweenRequests { get; set; } = 2;

    /// <summary>How long a checked title is left alone before it is worth asking again.</summary>
    [Range(1, 3650)]
    public int RecheckAfterDays { get; set; } = 30;

    /// <summary>
    /// How close a candidate's title has to be before its numbers are believed.
    ///
    /// 0.9 with room to spare: measured against a real library, every correct match scored 1.0
    /// and the closest wrong one scored 0.64.
    /// </summary>
    [Range(0.0, 1.0)]
    public double MatchThreshold { get; set; } = 0.9;

    /// <summary>
    /// How far the best candidate must beat the runner-up before the win counts.
    ///
    /// Without it a title HowLongToBeat lists twice — "Resident Evil 4" is there for 2005 and for
    /// 2023 — would be settled by a coin flip that looks exactly like a confident match.
    /// </summary>
    [Range(0.0, 1.0)]
    public double AmbiguityMargin { get; set; } = 0.05;

    /// <summary>
    /// The kill switch. HowLongToBeat is a website being read by a program that it never agreed
    /// to serve, and it has broken unofficial clients for months at a stretch before. When that
    /// happens this stops the retrying rather than requiring a release to do it.
    /// </summary>
    public bool Enabled { get; set; } = true;
}
