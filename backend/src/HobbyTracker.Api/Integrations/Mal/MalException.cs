namespace HobbyTracker.Api.Integrations.Mal;

/// <summary>
/// Raised when MyAnimeList fails or answers with something unusable. Distinct from a generic
/// HttpRequestException so the API layer can turn upstream trouble into a 502 rather than a
/// 500 — the difference between "their fault" and "our fault" is worth keeping.
///
/// A 404 is pointedly <b>not</b> one of these. An id MAL has never heard of is an answer, and
/// the caller can do something with it; wrapping it would make a withdrawn entry look like an
/// outage, and the backfill would blank a card over somebody else's record going away.
/// </summary>
public sealed class MalException(string message, Exception? innerException = null)
    : Exception(message, innerException);
