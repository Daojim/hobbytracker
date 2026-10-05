using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Metadata;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// A share, as somebody holding its link sees it: the owner's board, read-only, with nobody
/// signed in. The owner's half — making, changing and stopping a link — is
/// <see cref="ShareEndpointTests"/>.
///
/// <para>
/// <b>Whose board it is comes from the token, and never from whoever is asking.</b> Every read a
/// share reaches takes its owner explicitly; none of them asks <c>ICurrentUser</c>, whose
/// <c>Id</c> throws for a request with nobody signed in. So most cases here read anonymously,
/// where reaching it would be a 500, and the first reads as a signed-in stranger with a board of
/// their own, where reaching it would quietly answer with theirs.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class SharedBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    /// <summary>Every route a share has, each asked the way the shared pages ask it.</summary>
    private static readonly string[] EveryRoute =
    [
        "",
        "library?status=Backlog",
        "library?status=InProgress",
        "library?status=OnHold",
        "library?status=Completed",
        "library?status=Dropped",
        "years",
        "upcoming",
        "stats",
        "stats?year=2026",
        "stats/years",
    ];

    private static readonly SharePart[] EveryPart = Enum.GetValues<SharePart>();

    /// <summary>A token of the right shape that nobody holds.</summary>
    private const string Unknown = "Xk3fQ9dLm2RtVb7wYp4sHa";

    // ---------------------------------------------------------------- whose board

    [Fact]
    public async Task A_share_shows_its_owners_board_and_nobody_elses()
    {
        // The visitor is signed in and has a board of their own, with a title in common sitting
        // in another column. A share that asked the session whose board this is would answer
        // with the visitor's: Celeste under Playing, and Outer Wilds among the finishes.
        var celeste = await GivenGameAsync("Celeste", externalId: "1");
        var hollowKnight = await GivenGameAsync("Hollow Knight", externalId: "2");
        var outerWilds = await GivenGameAsync("Outer Wilds", externalId: "3");

        await GivenLogEntryAsync(celeste, LogStatus.Backlog);
        await GivenLogEntryAsync(hollowKnight, LogStatus.Completed, completedAt: Eastern(2026, 3, 1));

        var visitor = await GivenUserAsync("Visitor");
        await GivenLogEntryAsync(
            celeste, LogStatus.InProgress, startedAt: Eastern(2025, 2, 1), userId: visitor);
        await GivenLogEntryAsync(
            outerWilds, LogStatus.Completed, completedAt: Eastern(2024, 4, 1), userId: visitor);

        var share = await ShareAsync(SharePart.InProgress, SharePart.Completed, SharePart.Stats);
        var asVisitor = ClientFor(visitor);

        (await TitlesAsync(asVisitor, share, LogStatus.Backlog)).ShouldBe(["Celeste"]);
        (await TitlesAsync(asVisitor, share, LogStatus.InProgress)).ShouldBeEmpty();
        (await TitlesAsync(asVisitor, share, LogStatus.Completed)).ShouldBe(["Hollow Knight"]);

        // The years are the owner's too: 2026 is Hollow Knight's, and the visitor's 2024 and
        // 2025 are nowhere.
        (await ReadAsync<IReadOnlyList<int>>(await asVisitor.GetAsync(Shared(share, "years"), Ct)))
            .ShouldBe([2026]);

        var stats = await ReadAsync<StatsDto>(
            await asVisitor.GetAsync(Shared(share, "stats"), Ct));
        stats.Finished.Select(finish => finish.Title).ShouldBe(["Hollow Knight"]);
        stats.Backlog.Select(title => title.Title).ShouldBe(["Celeste"]);
    }

    [Fact]
    public async Task Every_route_of_a_share_answers_with_nobody_signed_in()
    {
        // ICurrentUser.Id throws when nobody is signed in, so a route that reached it would be a
        // 500 here. That throw is the backstop; this is what says no route leans on it.
        await GivenAFullBoardAsync();
        var share = await ShareAsync(EveryPart, showsName: true);

        foreach (var route in EveryRoute)
        {
            (await AnonymousClient.GetAsync(Shared(share, route), Ct)).StatusCode
                .ShouldBe(HttpStatusCode.OK, route);
        }
    }

    [Fact]
    public async Task A_share_says_which_board_it_is_and_what_it_shows()
    {
        var share = await ShareAsync(SharePart.Completed, SharePart.Stats);

        var board = await ReadAsync<SharedBoardDto>(
            await AnonymousClient.GetAsync(Shared(share, ""), Ct));

        board.Hobby.ShouldBe("games");
        board.Parts.ShouldBe([SharePart.Completed, SharePart.Stats]);
        board.Name.ShouldBeNull();
    }

    // ---------------------------------------------------------------- the same column

    [Fact]
    public async Task A_shared_column_is_the_owners_column_less_the_note()
    {
        // The same projection, the same order and the same hours as the owner's own board — every
        // column, in their order and by rating — and the one difference is the note. A share that
        // drifted from the board would show a stranger a different board than the owner sees.
        await GivenAFullBoardAsync();
        var share = await ShareAsync(EveryPart, showsName: false);

        foreach (var status in Enum.GetValues<LogStatus>())
        {
            foreach (var sort in new[] { "manual", "rating", "length" })
            {
                var query = $"status={status}&sort={sort}&year=2026";

                var own = await ReadAsync<LibraryPage>(
                    await Client.GetAsync($"/api/library?hobby=games&{query}", Ct));
                var shared = await ReadAsync<LibraryPage>(
                    await AnonymousClient.GetAsync(Shared(share, $"library?{query}"), Ct));

                var expected = own with
                {
                    Items = [.. own.Items.Select(item => item with { LatestNotePreview = null })],
                };

                JsonSerializer.Serialize(shared, Json).ShouldBe(JsonSerializer.Serialize(expected, Json), query);
            }
        }
    }

    [Fact]
    public async Task A_shared_column_is_named_and_its_year_has_a_span()
    {
        // A share is read a column at a time. Asked for no column, the board's route would answer
        // with every title on the board, whichever columns are shown — so naming one is required.
        var share = await ShareAsync(SharePart.Completed, SharePart.Stats);

        (await AnonymousClient.GetAsync(Shared(share, "library"), Ct)).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);

        // And bounded as the Stats route is, where the board's own route is not: year 0 has no
        // first instant, and 9999's would end in a year DateTime cannot hold. Unbounded, a
        // stranger's typo would be a 500 in the log.
        foreach (var route in new[]
                 {
                     "library?status=Completed&year=0",
                     "library?status=Completed&year=9999",
                     "stats?year=0",
                     "stats?year=9999",
                 })
        {
            (await AnonymousClient.GetAsync(Shared(share, route), Ct)).StatusCode
                .ShouldBe(HttpStatusCode.BadRequest, route);
        }
    }

    // ---------------------------------------------------------------- notes, never

    [Fact]
    public async Task No_route_a_share_reaches_reads_a_note()
    {
        // The most a share can be asked to show — every part and the name — over a board with a
        // note on every pass in every column and on the calendar. Asserted on the SQL as well as
        // on the answers: a note read and then dropped, or left out by a CASE around the
        // subquery that reads it, answers with the same JSON as one never read.
        await GivenAFullBoardAsync();
        var share = await ShareAsync(EveryPart, showsName: true);

        var recorder = new SqlRecorder();
        using var host = SqlRecorder.Into(Factory, recorder);
        using var visitor = host.CreateClient();

        // The owner's own board does read them — its cards show the last thing written — so this
        // proves the recorder can see a note being read. Without it, a record that never caught
        // anything would pass for the wrong reason.
        using var owner = host.CreateClient();
        owner.DefaultRequestHeaders.Add(
            TestAuthHandler.UserHeader, UserId.ToString(CultureInfo.InvariantCulture));
        (await owner.GetAsync("/api/library?hobby=games&status=Backlog", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.OK);
        recorder.Commands.ShouldContain(sql => SqlRecorder.ReadsNotes(sql));
        recorder.Clear();

        var answers = new List<string>();
        foreach (var route in EveryRoute)
        {
            var response = await visitor.GetAsync(Shared(share, route), Ct);
            response.StatusCode.ShouldBe(HttpStatusCode.OK, route);
            answers.Add(await response.Content.ReadAsStringAsync(Ct));
        }

        recorder.Commands.ShouldNotBeEmpty();
        recorder.Commands.Where(SqlRecorder.ReadsNotes).ShouldBeEmpty();
        answers.ShouldAllBe(answer => !answer.Contains("NOTE", StringComparison.Ordinal));
    }

    // ---------------------------------------------------------------- the name

    [Fact]
    public async Task The_owners_name_is_in_no_answer_unless_they_ticked_it()
    {
        await RenameAsync(UserId, "Ottoline Quist");
        await GivenAFullBoardAsync();
        var share = await ShareAsync(EveryPart, showsName: false);

        foreach (var route in EveryRoute)
        {
            (await AnswerAsync(share, route)).ShouldNotContain(
                "Ottoline", Case.Insensitive, route);
        }

        // Ticked, it heads the share's description, and that is the only place it goes.
        await ChangeAsync(EveryPart, showsName: true);

        (await ReadAsync<SharedBoardDto>(await AnonymousClient.GetAsync(Shared(share, ""), Ct)))
            .Name.ShouldBe("Ottoline Quist");

        foreach (var route in EveryRoute.Where(route => route != ""))
        {
            (await AnswerAsync(share, route)).ShouldNotContain(
                "Ottoline", Case.Insensitive, route);
        }
    }

    // ---------------------------------------------------------------- one 404

    [Fact]
    public async Task An_unknown_link_a_stopped_one_and_a_part_switched_off_answer_alike()
    {
        // Whether a link ever existed, and what its owner chose not to show, are both the owner's
        // business. So all three are the same 404, word for word: a visitor cannot tell a stopped
        // share from a mistyped one, or a column switched off from a share that never had it.
        var share = await ShareAsync(SharePart.InProgress);
        var answer = await NotFoundAsync(Unknown, "");

        foreach (var route in EveryRoute)
        {
            (await NotFoundAsync(Unknown, route)).ShouldBe(answer, $"unknown: {route}");
        }

        foreach (var route in new[]
                 {
                     "library?status=OnHold",
                     "library?status=Completed",
                     "library?status=Dropped",
                     "upcoming",
                     "stats",
                     "stats?year=2026",
                     "stats/years",
                 })
        {
            (await NotFoundAsync(share.Token, route)).ShouldBe(answer, $"switched off: {route}");
        }

        (await Client.DeleteAsync("/api/share?hobby=games", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        foreach (var route in EveryRoute)
        {
            (await NotFoundAsync(share.Token, route)).ShouldBe(answer, $"stopped: {route}");
        }
    }

    [Fact]
    public async Task Backlog_shows_on_every_share_and_nothing_else_until_it_is_ticked()
    {
        // Stored as what is shown, so a share made with nothing ticked shows Backlog and nothing
        // more — which is also what every share made today will show of a part added tomorrow.
        var celeste = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(celeste, LogStatus.Backlog);
        var share = await ShareAsync();

        (await TitlesAsync(AnonymousClient, share, LogStatus.Backlog)).ShouldBe(["Celeste"]);

        foreach (var route in new[]
                 {
                     "library?status=InProgress",
                     "library?status=OnHold",
                     "library?status=Completed",
                     "library?status=Dropped",
                     "upcoming",
                     "stats",
                     "stats/years",
                 })
        {
            (await AnonymousClient.GetAsync(Shared(share, route), Ct)).StatusCode
                .ShouldBe(HttpStatusCode.NotFound, route);
        }
    }

    [Fact]
    public async Task The_calendar_is_on_a_share_only_when_it_is_ticked()
    {
        var celeste = await GivenGameAsync("Celeste", externalId: "1");
        var witchbrook = await GivenGameAsync("Witchbrook", externalId: "2");
        await GivenLogEntryAsync(celeste, LogStatus.Backlog);
        await GivenLogEntryAsync(witchbrook, LogStatus.Backlog);
        await GivenReleaseWindowAsync(witchbrook, new DateOnly(2027, 3, 1), ReleasePrecision.Quarter);

        var share = await ShareAsync(SharePart.Completed);

        (await AnonymousClient.GetAsync(Shared(share, "upcoming"), Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);

        // Not out yet, so not in the column either, exactly as on the owner's board: with the
        // calendar off, a title waiting to come out is not on the share at all.
        (await TitlesAsync(AnonymousClient, share, LogStatus.Backlog)).ShouldBe(["Celeste"]);

        await ChangeAsync([SharePart.Completed, SharePart.Upcoming]);

        var upcoming = await ReadAsync<IReadOnlyList<LibraryItemDto>>(
            await AnonymousClient.GetAsync(Shared(share, "upcoming"), Ct));
        upcoming.Select(item => item.Title).ShouldBe(["Witchbrook"]);
        upcoming.ShouldAllBe(item => item.LatestNotePreview == null);
    }

    // ---------------------------------------------------------------- the years

    [Fact]
    public async Task A_shares_years_come_only_from_the_columns_it_shows()
    {
        // 2023 is a year only Dropped has anything in. Offered on a share without Dropped, it
        // would open on a board with nothing to show for it, and say a year happened that the
        // share does not.
        var outerWilds = await GivenGameAsync("Outer Wilds", externalId: "1");
        var celeste = await GivenGameAsync("Celeste", externalId: "2");
        var hollowKnight = await GivenGameAsync("Hollow Knight", externalId: "3");

        await GivenLogEntryAsync(outerWilds, LogStatus.Dropped, startedAt: Eastern(2023, 6, 1));
        await GivenLogEntryAsync(celeste, LogStatus.InProgress, startedAt: Eastern(2025, 2, 1));
        await GivenLogEntryAsync(hollowKnight, LogStatus.Completed, completedAt: Eastern(2024, 4, 1));

        var share = await ShareAsync(SharePart.InProgress, SharePart.Completed);
        (await YearsAsync(share)).ShouldBe([2025, 2024]);

        // With every column shown, the share's years are the board's own, by the board's rule.
        await ChangeAsync([SharePart.InProgress, SharePart.OnHold, SharePart.Completed, SharePart.Dropped]);

        var board = await ReadAsync<IReadOnlyList<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));
        (await YearsAsync(share)).ShouldBe(board);
        board.ShouldBe([2025, 2024, 2023]);
    }

    // ---------------------------------------------------------------- stats, whole

    [Fact]
    public async Task Stats_on_a_share_is_the_owners_page_whichever_columns_are_shown()
    {
        // Decided at the workshop: Stats is whole. Every finish, and what was dropped counted as a
        // number with no titles, so a share showing Stats and no column at all still has every
        // finish on its Stats page — and is, figure for figure, the page its owner sees.
        var tunic = await GivenGameAsync("Tunic", externalId: "1");
        var spiritfarer = await GivenGameAsync("Spiritfarer", externalId: "2");
        var celeste = await GivenGameAsync("Celeste", externalId: "3");

        await GivenLogEntryAsync(
            tunic, LogStatus.Completed, rating: 9.5m,
            startedAt: Eastern(2026, 1, 5), completedAt: Eastern(2026, 4, 1));
        await GivenLogEntryAsync(spiritfarer, LogStatus.Dropped, startedAt: Eastern(2023, 5, 1));
        await GivenLogEntryAsync(celeste, LogStatus.Backlog);

        var share = await ShareAsync(SharePart.Stats);

        foreach (var (route, owners) in new[]
                 {
                     ("stats", "/api/stats?hobby=games"),
                     ("stats?year=2026", "/api/stats?hobby=games&year=2026"),
                     ("stats?year=2023", "/api/stats?hobby=games&year=2023"),
                     ("stats/years", "/api/stats/years?hobby=games"),
                 })
        {
            (await AnswerAsync(share, route)).ShouldBe(
                await (await Client.GetAsync(owners, Ct)).Content.ReadAsStringAsync(Ct), route);
        }

        var dropped = await ReadAsync<StatsDto>(
            await AnonymousClient.GetAsync(Shared(share, "stats?year=2023"), Ct));
        dropped.Completion.Dropped.ShouldBe(1);
    }

    // ---------------------------------------------------------------- nothing to write

    [Fact]
    public async Task A_share_answers_reads_and_nothing_else()
    {
        var share = await ShareAsync(EveryPart, showsName: true);

        foreach (var route in new[] { "", "library", "years", "upcoming", "stats", "stats/years" })
        {
            foreach (var method in new[] { HttpMethod.Post, HttpMethod.Put, HttpMethod.Patch, HttpMethod.Delete })
            {
                var response = await AnonymousClient.SendAsync(
                    new HttpRequestMessage(method, Shared(share, route)), Ct);

                response.StatusCode.ShouldBe(HttpStatusCode.MethodNotAllowed, $"{method} {route}");
            }
        }
    }

    [Fact]
    public void The_only_routes_open_to_nobody_are_signing_in_and_reading_a_share()
    {
        // Read off the routing table rather than the controllers, so an anonymous route anywhere
        // — a write on the share's controller, or a new controller with no [Authorize] — changes
        // this list. Every one of a share's is a GET.
        var open = Factory.Services.GetRequiredService<EndpointDataSource>().Endpoints
            .OfType<RouteEndpoint>()
            .Where(endpoint =>
                endpoint.Metadata.GetMetadata<IAllowAnonymous>() is not null
                || !endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Any())
            .Select(endpoint =>
                $"{string.Join(",", endpoint.Metadata.GetMetadata<IHttpMethodMetadata>()?.HttpMethods ?? ["ANY"])} "
                + endpoint.RoutePattern.RawText)
            .Order(StringComparer.Ordinal)
            .ToList();

        open.ShouldBe(
        [
            "GET api/auth/me",
            "GET api/auth/{provider}/start",
            "GET api/shared/{token}",
            "GET api/shared/{token}/library",
            "GET api/shared/{token}/stats",
            "GET api/shared/{token}/stats/years",
            "GET api/shared/{token}/upcoming",
            "GET api/shared/{token}/years",
            "POST api/auth/logout",
        ]);
    }

    // ---------------------------------------------------------------- the account

    [Fact]
    public async Task Deleting_the_account_kills_its_share()
    {
        var share = await ShareAsync(SharePart.InProgress);
        (await AnonymousClient.GetAsync(Shared(share, ""), Ct)).StatusCode.ShouldBe(HttpStatusCode.OK);

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await AnonymousClient.GetAsync(Shared(share, ""), Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);

        // Gone rather than orphaned: the users row cascades to it, as it does to every pass.
        (await WithDbAsync(db => db.Database
            .SqlQuery<int>($"SELECT count(*)::int AS \"Value\" FROM board_shares")
            .SingleAsync(Ct))).ShouldBe(0);
    }

    // ---------------------------------------------------------------- helpers

    private static string Shared(ShareDto share, string route) => Shared(share.Token, route);

    private static string Shared(string token, string route) =>
        route == "" ? $"/api/shared/{token}" : $"/api/shared/{token}/{route}";

    private Task<ShareDto> ShareAsync(params SharePart[] parts) => ShareAsync(parts, showsName: false);

    private async Task<ShareDto> ShareAsync(SharePart[] parts, bool showsName)
    {
        var response = await Client.PostAsJsonAsync(
            "/api/share?hobby=games", new ShareRequest(parts, showsName), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        return await ReadAsync<ShareDto>(response);
    }

    private async Task ChangeAsync(SharePart[] parts, bool showsName = false)
    {
        var response = await Client.PutAsJsonAsync(
            "/api/share?hobby=games", new ShareRequest(parts, showsName), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
    }

    private async Task<IReadOnlyList<string>> TitlesAsync(
        HttpClient client, ShareDto share, LogStatus status)
    {
        var page = await ReadAsync<LibraryPage>(
            await client.GetAsync(Shared(share, $"library?status={status}"), Ct));

        return [.. page.Items.Select(item => item.Title)];
    }

    private async Task<IReadOnlyList<int>> YearsAsync(ShareDto share) =>
        await ReadAsync<IReadOnlyList<int>>(await AnonymousClient.GetAsync(Shared(share, "years"), Ct));

    private async Task<string> AnswerAsync(ShareDto share, string route)
    {
        var response = await AnonymousClient.GetAsync(Shared(share, route), Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, route);

        return await response.Content.ReadAsStringAsync(Ct);
    }

    /// <summary>
    /// A 404's answer with its trace id taken out — the one part of two answers that always
    /// differs, because it names the request rather than anything about the share.
    /// </summary>
    private async Task<string> NotFoundAsync(string token, string route)
    {
        var response = await AnonymousClient.GetAsync(Shared(token, route), Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.NotFound, route);

        var body = await response.Content.ReadAsStringAsync(Ct);
        if (body.Length == 0)
        {
            return "";
        }

        var problem = JsonNode.Parse(body)!.AsObject();
        problem.Remove("traceId");
        return problem.ToJsonString();
    }

    private Task RenameAsync(int userId, string displayName) => WithDbAsync(async db =>
    {
        var user = await db.Users.SingleAsync(candidate => candidate.Id == userId, Ct);
        user.DisplayName = displayName;
        await db.SaveChangesAsync(Ct);
    });

    /// <summary>
    /// A board with something in every place a share can show — every column, a finish with a
    /// rating and hours, and a title on the calendar — and a note on every pass of it.
    /// </summary>
    private async Task GivenAFullBoardAsync()
    {
        (string Title, LogStatus Status, DateTimeOffset? Started, DateTimeOffset? Completed)[] board =
        [
            ("Celeste", LogStatus.Backlog, null, null),
            ("Hollow Knight", LogStatus.InProgress, Eastern(2026, 2, 1), null),
            ("Outer Wilds", LogStatus.OnHold, Eastern(2026, 3, 1), null),
            ("Tunic", LogStatus.Completed, Eastern(2026, 1, 5), Eastern(2026, 4, 1)),
            ("Hades", LogStatus.Completed, null, Eastern(2026, 6, 1)),
            ("Spiritfarer", LogStatus.Dropped, Eastern(2026, 5, 1), null),
        ];

        var externalId = 0;
        foreach (var (title, status, started, completed) in board)
        {
            externalId += 1;
            var mediaId = await GivenGameAsync(
                title, externalId: externalId.ToString(CultureInfo.InvariantCulture));
            var entry = await GivenLogEntryAsync(
                mediaId, status, rating: status == LogStatus.Completed ? 9m : null,
                startedAt: started, completedAt: completed);
            await GivenNoteAsync(entry, $"NOTE on {title}");
        }

        // A finish with hours against an estimate, so the column's comparison has something to
        // add up, and a length for sort=length to order on.
        await WithDbAsync(async db =>
        {
            var tunic = await db.Games.SingleAsync(game => game.Title == "Tunic", Ct);
            tunic.HltbAllStylesHours = 21.5m;
            var pass = await db.LogEntries.SingleAsync(entry => entry.MediaId == tunic.Id, Ct);
            pass.HoursPlayed = 19.25m;
            await db.SaveChangesAsync(Ct);
        });

        // And one on the calendar: in Backlog, and not out until next year.
        var witchbrook = await GivenGameAsync("Witchbrook", externalId: "99");
        var waiting = await GivenLogEntryAsync(witchbrook, LogStatus.Backlog);
        await GivenNoteAsync(waiting, "NOTE on Witchbrook");
        await GivenReleaseWindowAsync(witchbrook, new DateOnly(2027, 3, 1), ReleasePrecision.Quarter);
    }

    /// <summary>
    /// A release window written straight onto the media row, through <see cref="ReleaseWindow.For"/>
    /// so a fixture cannot take a shape the check constraint forbids.
    /// </summary>
    private Task GivenReleaseWindowAsync(int mediaId, DateOnly day, ReleasePrecision precision) =>
        WithDbAsync(async db =>
        {
            var window = ReleaseWindow.For(day, precision);
            var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);

            media.ReleaseDate = window.Start;
            media.ReleaseEnd = window.End;
            media.ReleasePrecision = window.Precision;

            await db.SaveChangesAsync(Ct);
        });
}
