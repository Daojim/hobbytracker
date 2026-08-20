namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Binds every test class that needs a database to one shared container. Without this xUnit
/// would build a fixture per class, and starting a Postgres container per test class turns a
/// ten-second suite into a several-minute one.
/// </summary>
[CollectionDefinition(Name)]
public sealed class DatabaseCollection : ICollectionFixture<PostgresFixture>
{
    public const string Name = "postgres";
}
