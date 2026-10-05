using System.Net.Http.Json;
using System.Text.RegularExpressions;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Your board's share link, from the owner's side: seeing it, making it, changing what it shows,
/// and stopping it. What a visitor holding the link sees is <see cref="SharedBoardTests"/>.
///
/// <para>
/// <b>One link per board</b>, addressed by the hobby, so every route here takes <c>?hobby=</c> and
/// none takes an id. Making one where one exists is a 409, and stopping one deletes it: sharing
/// again is a new address.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed partial class ShareEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    private const string Games = "/api/share?hobby=games";

    // ---------------------------------------------------------------- seeing it

    [Fact]
    public async Task A_board_has_no_link_until_one_is_made()
    {
        // Opening the dialog makes nothing, so asking is not making: a 200 and a literal null,
        // as the session probe answers for nobody, rather than a 404 the dialog would have to
        // read as "no link yet" and every other failure would also look like.
        var response = await Client.GetAsync(Games, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await response.Content.ReadAsStringAsync(Ct)).ShouldBe("null");
    }

    // ---------------------------------------------------------------- making it

    [Fact]
    public async Task Making_a_link_answers_with_an_address_nobody_could_guess()
    {
        var response = await Client.PostAsJsonAsync(
            Games, new ShareRequest([SharePart.Completed], ShowsName: false), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var share = await ReadAsync<ShareDto>(response);

        // Sixteen random bytes in base64url: twenty-two characters, every one of them safe in a
        // path, and no padding to trim.
        TokenShape().IsMatch(share.Token).ShouldBeTrue(share.Token);
        share.Parts.ShouldBe([SharePart.Completed]);
        share.ShowsName.ShouldBeFalse();

        // And it is what the board's share is from then on.
        var again = await ReadAsync<ShareDto>(await Client.GetAsync(Games, Ct));
        again.Token.ShouldBe(share.Token);
    }

    [Fact]
    public async Task Every_link_is_its_own_address()
    {
        var stranger = await GivenUserAsync("Stranger");

        var games = await MakeAsync(Client, "games");
        var movies = await MakeAsync(Client, "movies");
        var theirs = await MakeAsync(ClientFor(stranger), "games");

        new[] { games.Token, movies.Token, theirs.Token }.Distinct().Count().ShouldBe(3);
    }

    [Fact]
    public async Task The_token_is_kept_as_it_was_handed_out()
    {
        // Plain text, decided by the user on 4 October 2026, so Settings can show the address
        // again whenever it is asked. Pinned because a hash is the obvious thing to "improve" it
        // into, and it would leave the dialog nothing to show.
        var share = await MakeAsync(Client, "games");

        var stored = await WithDbAsync(db => db.Database
            .SqlQuery<string>($"SELECT token AS \"Value\" FROM board_shares")
            .ToListAsync(Ct));

        stored.ShouldBe([share.Token]);
    }

    [Fact]
    public async Task A_link_shows_what_was_ticked_once_each_in_the_boards_order()
    {
        var response = await Client.PostAsJsonAsync(
            Games,
            new ShareRequest(
                [SharePart.Stats, SharePart.InProgress, SharePart.Stats, SharePart.Upcoming],
                ShowsName: true),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        var share = await ReadAsync<ShareDto>(response);

        // A part named twice is one part, and they come back in the enum's order whatever order
        // they were ticked in — the dialog's, columns first and then the rest.
        share.Parts.ShouldBe([SharePart.InProgress, SharePart.Upcoming, SharePart.Stats]);
        share.ShowsName.ShouldBeTrue();
    }

    [Fact]
    public async Task A_board_has_one_link()
    {
        // Only a stale dialog gets here: another tab made the link first. A second row would be
        // a second address nobody can see in Settings, and could not stop.
        var first = await MakeAsync(Client, "games");

        var second = await Client.PostAsJsonAsync(
            Games, new ShareRequest([SharePart.Completed], ShowsName: true), Json, Ct);

        second.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        // And the link that was there is untouched, parts and all.
        var kept = await ReadAsync<ShareDto>(await Client.GetAsync(Games, Ct));
        kept.Token.ShouldBe(first.Token);
        kept.Parts.ShouldBe(first.Parts);
        kept.ShowsName.ShouldBeFalse();
    }

    [Fact]
    public async Task Each_board_has_a_link_of_its_own()
    {
        await MakeAsync(Client, "games");

        (await (await Client.GetAsync("/api/share?hobby=movies", Ct)).Content.ReadAsStringAsync(Ct))
            .ShouldBe("null");
    }

    // ---------------------------------------------------------- changing what it shows

    [Fact]
    public async Task Ticking_a_box_changes_the_link_it_is_on()
    {
        var share = await MakeAsync(Client, "games", [SharePart.InProgress]);

        var response = await Client.PutAsJsonAsync(
            Games, new ShareRequest([SharePart.Completed, SharePart.Stats], ShowsName: true), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var changed = await ReadAsync<ShareDto>(response);

        // The same address: a box changes what the link shows, never which link it is.
        changed.Token.ShouldBe(share.Token);
        changed.Parts.ShouldBe([SharePart.Completed, SharePart.Stats]);
        changed.ShowsName.ShouldBeTrue();

        // Whoever holds the link sees the change on their next request.
        var seen = await ReadAsync<SharedBoardDto>(
            await AnonymousClient.GetAsync($"/api/shared/{share.Token}", Ct));
        seen.Parts.ShouldBe([SharePart.Completed, SharePart.Stats]);
    }

    [Fact]
    public async Task Changing_or_stopping_a_link_that_is_not_there_is_a_404()
    {
        (await Client.PutAsJsonAsync(
                Games, new ShareRequest([SharePart.Completed], ShowsName: false), Json, Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await Client.DeleteAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Neither of them made one on the way.
        (await WithDbAsync(db => db.Database
            .SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM board_shares")
            .SingleAsync(Ct))).ShouldBe(0);
    }

    // ---------------------------------------------------------------- stopping it

    [Fact]
    public async Task Stopping_a_link_kills_its_address()
    {
        var share = await MakeAsync(Client, "games");

        (await Client.DeleteAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await (await Client.GetAsync(Games, Ct)).Content.ReadAsStringAsync(Ct)).ShouldBe("null");
        (await AnonymousClient.GetAsync($"/api/shared/{share.Token}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Sharing_again_makes_a_new_address()
    {
        // Whoever had the old link loses it for good. That is what "stop sharing" says, and why
        // it asks first.
        var first = await MakeAsync(Client, "games");
        (await Client.DeleteAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var second = await MakeAsync(Client, "games");

        second.Token.ShouldNotBe(first.Token);
        (await AnonymousClient.GetAsync($"/api/shared/{first.Token}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);
        (await AnonymousClient.GetAsync($"/api/shared/{second.Token}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.OK);
    }

    // ---------------------------------------------------------------- whose it is

    [Fact]
    public async Task Somebody_elses_link_is_not_yours_to_see_change_or_stop()
    {
        // The routes are addressed by hobby alone, so "this board's link" has to mean yours, or a
        // stranger asking about games would be handed your address and could stop it.
        var stranger = ClientFor(await GivenUserAsync("Stranger"));
        var mine = await MakeAsync(Client, "games", [SharePart.Completed]);

        (await (await stranger.GetAsync(Games, Ct)).Content.ReadAsStringAsync(Ct)).ShouldBe("null");
        (await stranger.PutAsJsonAsync(
                Games, new ShareRequest([SharePart.Stats], ShowsName: true), Json, Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await stranger.DeleteAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.NotFound);

        var kept = await ReadAsync<SharedBoardDto>(
            await AnonymousClient.GetAsync($"/api/shared/{mine.Token}", Ct));
        kept.Parts.ShouldBe([SharePart.Completed]);
        kept.Name.ShouldBeNull();
    }

    [Fact]
    public async Task Nobody_signed_in_can_see_make_change_or_stop_a_link()
    {
        // 401s rather than the 500 ICurrentUser throws when it is reached with nobody signed in.
        var request = new ShareRequest([SharePart.Completed], ShowsName: false);

        (await AnonymousClient.GetAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.PostAsJsonAsync(Games, request, Json, Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.PutAsJsonAsync(Games, request, Json, Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.DeleteAsync(Games, Ct)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    // ---------------------------------------------------------------- what it accepts

    [Fact]
    public async Task A_hobby_nobody_has_heard_of_is_refused()
    {
        // The library's guard, for the library's reason: a link to a misspelt board would be a
        // share of nothing that reads as an empty board.
        var response = await Client.PostAsJsonAsync(
            "/api/share?hobby=boardgames", new ShareRequest([], ShowsName: false), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Backlog_is_not_a_part_and_neither_is_anything_unknown()
    {
        // Backlog always shows, so it has no box. Named anyway, it is refused rather than quietly
        // ignored: a client that thinks Backlog is optional has misunderstood something.
        foreach (var part in new[] { "Backlog", "Notes", "Everything" })
        {
            var response = await Client.PostAsync(
                Games,
                new StringContent(
                    $$"""{"parts":["Completed","{{part}}"],"showsName":false}""",
                    Encoding.UTF8,
                    "application/json"),
                Ct);

            response.StatusCode.ShouldBe(HttpStatusCode.BadRequest, part);
        }
    }

    [Fact]
    public async Task What_a_link_shows_has_to_be_said()
    {
        // Every box is sent every time, so a body without the list is a client that forgot
        // rather than one that means "nothing" — which an empty list says, and is allowed.
        var missing = await Client.PostAsync(
            Games, new StringContent("""{"showsName":false}""", Encoding.UTF8, "application/json"), Ct);
        missing.StatusCode.ShouldBe(HttpStatusCode.BadRequest);

        var nothing = await Client.PostAsJsonAsync(
            Games, new ShareRequest([], ShowsName: false), Json, Ct);
        nothing.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<ShareDto>(nothing)).Parts.ShouldBeEmpty();
    }

    // ---------------------------------------------------------------- helpers

    [GeneratedRegex("^[A-Za-z0-9_-]{22}$")]
    private static partial Regex TokenShape();

    private async Task<ShareDto> MakeAsync(
        HttpClient client, string hobby, SharePart[]? parts = null)
    {
        var response = await client.PostAsJsonAsync(
            $"/api/share?hobby={hobby}",
            new ShareRequest(parts ?? [SharePart.InProgress, SharePart.Completed], ShowsName: false),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        return await ReadAsync<ShareDto>(response);
    }
}
