namespace HobbyTracker.Api.Integrations.Wikidata;

/// <summary>
/// Raised when Wikidata's query service fails or answers with something unusable. A slug Wikidata
/// ties to nothing is not one of these: that is an empty answer, and the most common one.
/// </summary>
public sealed class WikidataException(string message, Exception? innerException = null)
    : Exception(message, innerException);
