using System.ComponentModel.DataAnnotations;

namespace HobbyTracker.Api.Integrations.Wikidata;

public class WikidataOptions
{
    public const string SectionName = "Wikidata";

    /// <summary>
    /// Wikidata's SPARQL endpoint, asked with a POST. Keyless and read-only, so there is no secret
    /// here, and the setting exists so the end-to-end suite can point the client at a stub.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string Endpoint { get; set; } = "https://query.wikidata.org/sparql";

    /// <summary>
    /// Who is asking. Wikimedia asks every program that reads its query service to name itself,
    /// and throttles the ones that do not; this names the app and nothing else.
    /// </summary>
    [Required(AllowEmptyStrings = false)]
    public string UserAgent { get; set; } = "HobbyTracker/1.0 (a personal hobby journal)";

    [Range(1, 120)]
    public int RequestTimeoutSeconds { get; set; } = 15;
}
