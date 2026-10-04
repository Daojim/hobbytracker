using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Security.Claims;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Your account: what deleting it would take, deleting it, and what becomes of a session that
/// outlives it.
///
/// <para>
/// <b>Passes are made through the API here wherever their history matters</b>, because
/// <c>PostgresFixture.CreateDbContext()</c> builds a context with no recorder in it — a pass seeded
/// with <c>GivenLogEntryAsync</c> has no <c>status_changes</c> row for a delete to take.
/// </para>
///
/// <para>
/// <b>The last block signs in by a real session cookie</b>, on a host that reads cookies as
/// production does, where everything else here signs in by header. The trap it covers lives in the
/// cookie scheme's own events, which the header never reaches: see <see cref="CookieHost"/>.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AccountEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------- what it would take

    [Fact]
    public async Task Counts_the_titles_on_every_board_and_every_note()
    {
        var hollowKnight = await GivenGameAsync("Hollow Knight", externalId: "1");
        var celeste = await GivenGameAsync("Celeste", externalId: "2");
        var arrival = await GivenMovieAsync("Arrival", externalId: "1");
        var severance = await GivenShowAsync("Severance", externalId: "1");
        var frieren = await GivenAnimeAsync("Sousou no Frieren", externalId: "1");

        // Two passes of one game is still one title on the board, which is what the warning
        // counts: what you would lose, as you see it, rather than how many times you played it.
        var first = await GivenLogEntryAsync(hollowKnight, LogStatus.Completed);
        await GivenLogEntryAsync(hollowKnight, LogStatus.InProgress);
        await GivenLogEntryAsync(celeste, LogStatus.Backlog);
        var film = await GivenLogEntryAsync(arrival, LogStatus.Completed);
        await GivenLogEntryAsync(severance, LogStatus.InProgress);
        await GivenLogEntryAsync(frieren, LogStatus.Backlog);

        await GivenNoteAsync(first, "Mantis Lords first try");
        await GivenNoteAsync(first, "Pantheon 5 still beats me");
        await GivenNoteAsync(film, "Heptapods");

        var account = await ReadAsync<AccountDto>(await Client.GetAsync("/api/account", Ct));

        // In hobby_lu's order, which is the nav's. Anime is last there and first by name, which
        // is what keeps an alphabetical order from passing. No books and no music: a board with
        // nothing on it is left out rather than sent as nought.
        account.Boards.ShouldBe(
        [
            new BoardTitlesDto("games", 2),
            new BoardTitlesDto("movies", 1),
            new BoardTitlesDto("tv", 1),
            new BoardTitlesDto("anime", 1),
        ]);
        account.Notes.ShouldBe(3);
    }

    [Fact]
    public async Task Counts_nothing_of_anybody_elses()
    {
        // The titles are shared and the passes are not. Somebody else's replay of a title you
        // also have, their note on it, and a board only they use must all stay out of your count.
        var stranger = await GivenUserAsync("Stranger");
        var shared = await GivenGameAsync("Hollow Knight", externalId: "1");
        var frieren = await GivenAnimeAsync("Sousou no Frieren", externalId: "1");

        var mine = await GivenLogEntryAsync(shared, LogStatus.Backlog);
        await GivenNoteAsync(mine, "Mine");

        var theirs = await GivenLogEntryAsync(shared, LogStatus.Completed, userId: stranger);
        await GivenLogEntryAsync(frieren, LogStatus.InProgress, userId: stranger);
        await GivenNoteAsync(theirs, "Theirs");
        await GivenNoteAsync(theirs, "Theirs again");

        var account = await ReadAsync<AccountDto>(await Client.GetAsync("/api/account", Ct));

        account.Boards.ShouldBe([new BoardTitlesDto("games", 1)]);
        account.Notes.ShouldBe(1);
    }

    [Fact]
    public async Task An_account_with_nothing_on_it_counts_nothing()
    {
        var account = await ReadAsync<AccountDto>(await Client.GetAsync("/api/account", Ct));

        account.Boards.ShouldBeEmpty();
        account.Notes.ShouldBe(0);
    }

    [Fact]
    public async Task Says_which_sign_in_the_account_is()
    {
        // The same person at Google and at Discord is two accounts until linking exists, and the
        // provider is the only thing that tells them apart. In the order they were linked.
        await GivenIdentityAsync(UserId, AuthProviders.Google, "google-1");
        await GivenIdentityAsync(UserId, AuthProviders.Discord, "discord-1");

        var stranger = await GivenUserAsync("Stranger");
        await GivenIdentityAsync(stranger, AuthProviders.Discord, "discord-2");

        var account = await ReadAsync<AccountDto>(await Client.GetAsync("/api/account", Ct));

        account.SignedInWith.ShouldBe([AuthProviders.Google, AuthProviders.Discord]);
    }

    // ------------------------------------------------------------- deleting it

    [Fact]
    public async Task Deleting_an_account_takes_everything_it_owns()
    {
        var gameId = await GivenGameAsync("Hollow Knight");
        var filmId = await GivenMovieAsync("Arrival");
        await GivenIdentityAsync(UserId, AuthProviders.Google, "google-1");
        await GivenEverythingAsync(UserId, gameId);
        await GivenEverythingAsync(UserId, filmId);

        // The arrange is only worth anything if it made what the delete is meant to take.
        (await RowsOfAsync(UserId)).ShouldBe(new Rows(1, 1, 2, 2, 2));

        var response = await Client.DeleteAsync("/api/account", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await RowsOfAsync(UserId)).ShouldBe(new Rows(0, 0, 0, 0, 0));
    }

    [Fact]
    public async Task Deleting_an_account_leaves_everybody_elses_alone()
    {
        // On the same title, which is the case a delete keyed on the wrong column would reach.
        var stranger = await GivenUserAsync("Stranger");
        var gameId = await GivenGameAsync("Hollow Knight");
        await GivenIdentityAsync(UserId, AuthProviders.Google, "google-1");
        await GivenIdentityAsync(stranger, AuthProviders.Google, "google-2");
        await GivenEverythingAsync(UserId, gameId);
        await GivenEverythingAsync(stranger, gameId);

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await RowsOfAsync(stranger)).ShouldBe(new Rows(1, 1, 1, 1, 1));
    }

    [Fact]
    public async Task Deleting_an_account_leaves_the_catalogue_alone()
    {
        // Titles, their detail rows and a HowLongToBeat id somebody pinned are everybody's. The
        // pass on a title is yours; the title is not.
        var gameId = await GivenGameAsync("Hollow Knight");
        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == gameId, Ct);
            game.HltbId = 26286;
            await db.SaveChangesAsync(Ct);
        });
        await GivenEverythingAsync(UserId, gameId);

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var game = await WithDbAsync(db => db.Games.SingleOrDefaultAsync(
            candidate => candidate.Id == gameId, Ct));
        game.ShouldNotBeNull();
        game.Title.ShouldBe("Hollow Knight");
        game.HltbId.ShouldBe(26286);
    }

    [Fact]
    public async Task Deleting_an_account_signs_this_browser_out()
    {
        var response = await Client.DeleteAsync("/api/account", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        ExpiresTheSession(response);
    }

    [Fact]
    public async Task Nobody_signed_in_can_count_or_delete_anything()
    {
        // A 401 rather than the 500 ICurrentUser throws when it is reached with nobody signed in.
        (await AnonymousClient.GetAsync("/api/account", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.DeleteAsync("/api/account", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);

        (await WithDbAsync(db => db.Users.CountAsync(Ct))).ShouldBe(1);
    }

    // ------------------------------------------- a session that outlives its account

    [Fact]
    public async Task A_session_whose_account_is_gone_is_signed_out()
    {
        // Another device, still holding the cookie it was given at sign-in. The cookie is
        // self-contained, so nothing about it changes when the row it names is deleted. And
        // somebody else still has an account, so the check has to be about this one.
        await GivenUserAsync("Stranger");
        var host = CookieHost();
        using var otherDevice = SignedInByCookie(host, UserId);

        (await otherDevice.GetAsync(Backlog, Ct)).StatusCode.ShouldBe(HttpStatusCode.OK);

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var response = await otherDevice.GetAsync(Backlog, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        ExpiresTheSession(response);
    }

    [Fact]
    public async Task A_session_whose_account_is_gone_cannot_write()
    {
        // The worse half of the trap. A read scoped to an id with no rows comes back empty, which
        // at least looks like a board; a write names that id in a foreign key, and the insert
        // fails as a 500 on a request that had nothing wrong with it.
        var gameId = await GivenGameAsync("Hollow Knight");
        var host = CookieHost();
        using var otherDevice = SignedInByCookie(host, UserId);

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var response = await otherDevice.PostAsJsonAsync(
            $"/api/library/{gameId}", new AddToBoardRequest(LogStatus.Backlog), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(0);
    }

    // ---------------------------------------------------------------- helpers

    private const string Backlog = "/api/library?hobby=games&status=Backlog";

    /// <summary>What one account has, row by row, for asserting a delete took all of it.</summary>
    private sealed record Rows(int Users, int Identities, int Passes, int Notes, int History);

    private Task<Rows> RowsOfAsync(int userId) => WithDbAsync(async db => new Rows(
        await db.Users.CountAsync(user => user.Id == userId, Ct),
        await db.AuthIdentities.CountAsync(identity => identity.UserId == userId, Ct),
        await db.LogEntries.CountAsync(entry => entry.UserId == userId, Ct),
        await db.Notes.CountAsync(note => note.LogEntry!.UserId == userId, Ct),
        await db.StatusChanges.CountAsync(change => change.LogEntry!.UserId == userId, Ct)));

    private Task GivenIdentityAsync(int userId, string provider, string subject) =>
        WithDbAsync(async db =>
        {
            db.AuthIdentities.Add(new AuthIdentity
            {
                UserId = userId,
                Provider = provider,
                ProviderUserId = subject,
                Email = $"{subject}@example.com",
            });
            await db.SaveChangesAsync(Ct);
        });

    /// <summary>
    /// A title on somebody's board as the app would put it there: through the API, so the pass
    /// arrives with the history the recorder writes, and then a note on it.
    /// </summary>
    private async Task GivenEverythingAsync(int userId, int mediaId)
    {
        var added = await ClientFor(userId).PostAsJsonAsync(
            $"/api/library/{mediaId}", new AddToBoardRequest(LogStatus.InProgress), Json, Ct);
        added.StatusCode.ShouldBe(HttpStatusCode.Created);

        var entryId = await WithDbAsync(db => db.LogEntries
            .Where(entry => entry.UserId == userId && entry.MediaId == mediaId)
            .Select(entry => entry.Id)
            .SingleAsync(Ct));

        await GivenNoteAsync(entryId, "Something worth keeping");
    }

    /// <summary>
    /// The API, reading sessions from the cookie as production does.
    ///
    /// The suite's own host signs in by header (<see cref="TestAuthHandler"/>), which never
    /// consults the cookie scheme or its events. This one puts the cookie scheme back as the
    /// default, so a request is authenticated by the real handler, with the real
    /// <c>OnValidatePrincipal</c>, from a cookie the real ticket format wrote.
    /// </summary>
    private WebApplicationFactory<Program> CookieHost() =>
        Factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(
            services => services.Configure<AuthenticationOptions>(options =>
                options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme)));

    /// <summary>
    /// A client holding a session cookie for <paramref name="userId"/>, sealed by the host's own
    /// ticket format: the same claim the sign-in puts there, and persistent, as every sign-in is.
    /// It sends that cookie on every request whatever a response says, which is what a second
    /// device does — the response that clears it goes to the device that deleted the account.
    /// </summary>
    private static HttpClient SignedInByCookie(WebApplicationFactory<Program> host, int userId)
    {
        var cookie = host.Services
            .GetRequiredService<IOptionsMonitor<CookieAuthenticationOptions>>()
            .Get(CookieAuthenticationDefaults.AuthenticationScheme);

        var principal = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.NameIdentifier, userId.ToString(CultureInfo.InvariantCulture))],
            AuthProviders.Google));

        var ticket = new AuthenticationTicket(
            principal,
            new AuthenticationProperties { IsPersistent = true },
            CookieAuthenticationDefaults.AuthenticationScheme);

        var client = host.CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false,
        });
        client.DefaultRequestHeaders.Add(
            "Cookie", $"{cookie.Cookie.Name}={cookie.TicketDataFormat.Protect(ticket)}");

        return client;
    }

    /// <summary>The response tells the browser to forget its session cookie.</summary>
    private static void ExpiresTheSession(HttpResponseMessage response)
    {
        response.Headers.TryGetValues("Set-Cookie", out var cookies).ShouldBeTrue();
        cookies!.ShouldContain(cookie =>
            cookie.StartsWith("hobbytracker.session=;", StringComparison.Ordinal)
            && cookie.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase));
    }
}
