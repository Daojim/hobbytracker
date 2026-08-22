namespace HobbyTracker.Api.Integrations.Hltb;

public sealed class HltbException(string message, Exception? innerException = null)
    : Exception(message, innerException);
