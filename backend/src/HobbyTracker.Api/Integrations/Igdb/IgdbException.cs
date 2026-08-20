namespace HobbyTracker.Api.Integrations.Igdb;

/// <summary>
/// Raised when IGDB or Twitch fails or answers with something unusable. Distinct from a
/// generic HttpRequestException so the API layer can turn upstream trouble into a 502 rather
/// than a 500 — the difference between "their fault" and "our fault" is worth keeping.
/// </summary>
public sealed class IgdbException(string message, Exception? innerException = null)
    : Exception(message, innerException);
