namespace HobbyTracker.Api.Integrations.OpenCritic;

/// <summary>
/// Raised when OpenCritic fails or answers with something unusable: unreachable, too slow, a key
/// RapidAPI refuses, or a day's allowance spent. Distinct from a generic HttpRequestException so
/// the one route that waits on OpenCritic, the pin, can turn it into a 502 rather than a 500.
///
/// An id OpenCritic does not know is pointedly <b>not</b> one of these. It is an answer — the pin
/// says so in words — where wrapping it would make a typo look like an outage.
/// </summary>
public sealed class OpenCriticException(string message, Exception? innerException = null)
    : Exception(message, innerException);
