namespace HobbyTracker.Api.Integrations.Steam;

/// <summary>
/// Raised when Steam fails or answers with something unusable — a 429 included, which on a keyless
/// route shared with every other keyless caller says something is wrong rather than merely busy.
///
/// An app Steam has nothing to say about is pointedly <b>not</b> one of these. Steam answers it with
/// an empty response rather than an error, and that is an answer the caller can act on: no verdict.
/// </summary>
public sealed class SteamException(string message, Exception? innerException = null)
    : Exception(message, innerException);
