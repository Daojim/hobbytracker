namespace HobbyTracker.Api.Integrations.Tmdb;

/// <summary>
/// Raised when TMDB fails or answers with something unusable. Distinct from a generic
/// HttpRequestException so the API layer can turn upstream trouble into a 502 rather than a
/// 500 — the difference between "their fault" and "our fault" is worth keeping.
///
/// A 404 is pointedly **not** one of these. An id TMDB has never heard of is an answer, and the
/// caller can do something with it; wrapping it would make a stale id look like an outage.
/// </summary>
public sealed class TmdbException(string message, Exception? innerException = null)
    : Exception(message, innerException);
