using System.Net;
using HobbyTracker.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Shouldly;

namespace HobbyTracker.Api.Tests.Infrastructure;

/// <summary>
/// Proves the harness itself works before anything is built on top of it. A test suite that is
/// green because it never really started the app is worse than no suite at all.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class HarnessTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Migrations_run_and_produce_every_table()
    {
        var tables = await WithDbAsync(async db =>
        {
            var connection = db.Database.GetDbConnection();
            await db.Database.OpenConnectionAsync();

            await using var command = connection.CreateCommand();
            command.CommandText =
                "select table_name from information_schema.tables where table_schema = 'public'";

            var names = new List<string>();
            await using var reader = await command.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                names.Add(reader.GetString(0));
            }

            return names;
        });

        tables.ShouldContain("media");
        tables.ShouldContain("games");
        tables.ShouldContain("log_entries");
        tables.ShouldContain("hobby_lu");
        tables.ShouldContain("source_lu");
        tables.ShouldContain("users");
        tables.ShouldContain("auth_identities");
    }

    [Fact]
    public async Task Seeded_lookups_survive_the_respawn_reset()
    {
        // InitializeAsync already reset the database before this test ran, so if the lookups
        // were not in TablesToIgnore they would be gone by now.
        var sources = await WithDbAsync(db => db.Sources.OrderBy(s => s.Id).ToListAsync(Ct));
        var hobbies = await WithDbAsync(db => db.Hobbies.OrderBy(h => h.Id).ToListAsync(Ct));

        hobbies.Count.ShouldBe(6);
        sources.Count.ShouldBe(5);
        sources.Single(s => s.Name == "igdb").BaseUrl.ShouldBe("https://api.igdb.com/v4/");
        sources.Single(s => s.Name == "manual").BaseUrl.ShouldBeNull();
        sources.Single(s => s.Name == "tmdb").BaseUrl.ShouldBe("https://api.themoviedb.org/3/");
        sources.Single(s => s.Name == "tmdb-tv").BaseUrl.ShouldBe("https://api.themoviedb.org/3/tv/");
        sources.Single(s => s.Name == "mal").BaseUrl.ShouldBe("https://api.myanimelist.net/v2/");
    }

    [Fact]
    public async Task Host_boots_and_serves_requests()
    {
        // Exercises two things at once: Program is reachable to WebApplicationFactory, and
        // IgdbOptions validation passes on the placeholder credentials the factory supplies.
        var response = await Client.GetAsync("/api/games", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Igdb_is_faked_so_no_test_reaches_the_network()
    {
        Igdb.SetResults("halo", FakeIgdbClient.Game(740, "Halo: Combat Evolved"));

        var response = await Client.GetAsync("/api/games?search=halo", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        Igdb.Calls.ShouldHaveSingleItem().Search.ShouldBe("halo");
    }

    [Fact]
    public async Task A_time_zone_the_platform_cannot_resolve_stops_the_host_booting()
    {
        // The mirror of the test above. ValidateOnStart is only worth having if it actually
        // fails the boot: a zone id that quietly fell back to UTC would put every evening's
        // dates a day out with nothing anywhere looking broken.
        await using var factory = new ApiFactory(Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, timeZone: "Mars/Olympus_Mons");

        var error = Should.Throw<OptionsValidationException>(() => factory.CreateClient());

        error.Message.ShouldContain("Journal:TimeZone");
    }

    [Fact]
    public async Task A_missing_google_client_id_stops_the_host_booting()
    {
        // The same guard the IGDB credentials get, for the same reason: absent credentials
        // should fail at boot naming the setting, not surface later as an opaque error from
        // the provider on the first person's first sign-in.
        await using var factory = new ApiFactory(
            Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, googleClientId: "");

        var error = Should.Throw<OptionsValidationException>(() => factory.CreateClient());

        error.Message.ShouldContain("Auth:Google:ClientId");
    }

    [Fact]
    public async Task A_public_origin_that_is_not_an_absolute_url_stops_the_host_booting()
    {
        // The pin decides the redirect URI every provider is handed, so a malformed one is not
        // a cosmetic problem: it is a sign-in that fails at the provider, for everybody, with
        // the error arriving from somebody else's server. Absent is fine and means "use the
        // request"; present and unusable has to stop the boot naming itself.
        await using var factory = new ApiFactory(
            Postgres, Igdb, Tmdb, Mal, Hltb, HltbQueue, Clock, publicOrigin: "hobbytracker.example");

        var error = Should.Throw<OptionsValidationException>(() => factory.CreateClient());

        error.Message.ShouldContain("PublicOrigin:Url");
    }
}
