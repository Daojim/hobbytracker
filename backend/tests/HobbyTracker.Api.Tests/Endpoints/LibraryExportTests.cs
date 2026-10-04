using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// <c>GET /api/library/export</c>: everything on your board for one hobby, with every pass and
/// every note, for the spreadsheet the Settings panel downloads.
///
/// <para>
/// <b>Everything, not what the board is showing.</b> The year control and the columns taken off
/// in Settings decide what you see, not what you have, so these arrange what the board would
/// leave out — an old year, a column, the calendar's titles, the hundred-and-first card — and
/// say that the export does not.
/// </para>
///
/// <para>
/// <b>And none of anybody else's.</b> The titles are shared and the passes and notes are not, so
/// the scoping cases put a stranger's pass on the same title, where an unscoped query would find
/// it.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LibraryExportTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------------------ what comes back

    [Fact]
    public async Task Every_title_comes_back_with_every_pass_and_every_note()
    {
        var hollow = await GivenGameAsync("Hollow Knight", "1");
        var celeste = await GivenGameAsync("Celeste", "2");

        // A finish, then the replay after it, each with something written during it.
        var first = await GivenLogEntryAsync(
            hollow, LogStatus.Completed, rating: 9m,
            startedAt: Eastern(2026, 6, 1), completedAt: Eastern(2026, 7, 4), platform: "PC");
        await GivenNoteAsync(first, "Mantis Lords first try", writtenAt: Eastern(2026, 6, 20));
        await GivenNoteAsync(first, "Pantheon 5 still beats me", writtenAt: Eastern(2026, 7, 2));

        Clock.UtcNow += TimeSpan.FromDays(1);
        var replay = await GivenLogEntryAsync(hollow, LogStatus.InProgress, startedAt: Eastern(2026, 9, 15));
        await GivenNoteAsync(replay, "Steel Soul this time");

        await GivenLogEntryAsync(celeste, LogStatus.Backlog);

        var export = await ExportAsync();

        export.Select(title => title.MediaId).ShouldBe([hollow, celeste], ignoreOrder: true);

        var passes = export.Single(title => title.MediaId == hollow).Passes;
        passes.Select(pass => pass.Id).ShouldBe([replay, first]);
        passes[0].Notes.ShouldHaveSingleItem().Body.ShouldBe("Steel Soul this time");
        passes[1].Notes.Select(note => note.Body)
            .ShouldBe(["Pantheon 5 still beats me", "Mantis Lords first try"]);

        // The pass as the journal reads one, field for field: LogEntryDto is the shape.
        passes[1].Status.ShouldBe(LogStatus.Completed);
        passes[1].Rating.ShouldBe(9m);
        passes[1].Platform.ShouldBe("PC");
        passes[1].CompletedAt.ShouldBe(Eastern(2026, 7, 4));

        export.Single(title => title.MediaId == celeste).Passes.ShouldHaveSingleItem()
            .Notes.ShouldBeEmpty();
    }

    [Fact]
    public async Task Nothing_of_anybody_elses_comes_back()
    {
        // Their pass on the shared title is logged in the same instant as mine and has the higher
        // id, so a pass query that forgot whose passes it was reading would put theirs first and
        // call it the one the card shows.
        var other = await GivenUserAsync("Someone Else");
        var shared = await GivenGameAsync("Hollow Knight", "1");
        var theirsAlone = await GivenGameAsync("Celeste", "2");

        var mine = await GivenLogEntryAsync(shared, LogStatus.InProgress);
        await GivenNoteAsync(mine, "Mine");

        var theirs = await GivenLogEntryAsync(shared, LogStatus.Completed, rating: 3m, userId: other);
        await GivenNoteAsync(theirs, "Theirs");
        await GivenNoteAsync(
            await GivenLogEntryAsync(theirsAlone, LogStatus.Backlog, userId: other), "Also theirs");

        var title = (await ExportAsync()).ShouldHaveSingleItem();

        title.MediaId.ShouldBe(shared);
        var pass = title.Passes.ShouldHaveSingleItem();
        pass.Id.ShouldBe(mine);
        pass.Notes.ShouldHaveSingleItem().Body.ShouldBe("Mine");
    }

    [Fact]
    public async Task More_than_a_page_of_titles_all_come_back()
    {
        // A board column stops at a page, and a page stops at Paging.MaxPageSize. The export is
        // the whole board, so it is not paged at all.
        var titles = Paging.MaxPageSize + 1;
        await GivenBacklogOfAsync(titles);

        (await ExportAsync()).Count.ShouldBe(titles);
    }

    [Fact]
    public async Task Every_column_every_year_and_the_calendar_come_back()
    {
        // What the year control and Settings leave off the board is still yours. A Completed
        // title from 2019 is off a board reading 2026; an unreleased Backlog title is on the
        // calendar rather than in the column; and the server has no idea which columns a browser
        // has taken off, so all five come back whatever Settings says.
        var expected = new List<int>();
        var externalId = 0;

        foreach (var status in Enum.GetValues<LogStatus>())
        {
            var mediaId = await GivenGameAsync($"In {status}", (++externalId).ToString());
            await GivenLogEntryAsync(mediaId, status);
            expected.Add(mediaId);
        }

        var finishedLongAgo = await GivenGameAsync("Finished in 2019", (++externalId).ToString());
        await GivenLogEntryAsync(
            finishedLongAgo, LogStatus.Completed,
            startedAt: Eastern(2019, 3, 1), completedAt: Eastern(2019, 5, 20));
        expected.Add(finishedLongAgo);

        var comingSoon = await GivenGameAsync("Silksong II", (++externalId).ToString());
        await GivenLogEntryAsync(comingSoon, LogStatus.Backlog);
        await GivenReleaseWindowAsync(comingSoon, new DateOnly(2027, 3, 12), ReleasePrecision.Day);
        expected.Add(comingSoon);

        (await ExportAsync()).Select(title => title.MediaId).ShouldBe(expected, ignoreOrder: true);
    }

    [Fact]
    public async Task Titles_come_in_the_order_the_board_ranks_them_by_hand()
    {
        // Within a column, the manual ranking — what the client lays out column by column. Ranked
        // here against the order the titles were added in, so an export ordered by id, by title
        // or by nothing at all cannot pass by accident.
        var (a, b, c) = (
            await GivenGameAsync("Alpha", "1"),
            await GivenGameAsync("Bravo", "2"),
            await GivenGameAsync("Charlie", "3"));
        var (d, e) = (await GivenGameAsync("Delta", "4"), await GivenGameAsync("Echo", "5"));

        foreach (var mediaId in new[] { a, b, c })
        {
            await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        }

        foreach (var mediaId in new[] { d, e })
        {
            await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        }

        await RankAsync(LogStatus.Backlog, [c, a, b]);
        await RankAsync(LogStatus.Completed, [e, d]);

        var export = await ExportAsync();

        InColumn(export, LogStatus.Backlog).ShouldBe([c, a, b]);
        InColumn(export, LogStatus.Completed).ShouldBe([e, d]);

        // And that is the board's own answer, not merely an order that happens to match it.
        (await ColumnAsync(LogStatus.Backlog)).Items.Select(item => item.MediaId)
            .ShouldBe(InColumn(export, LogStatus.Backlog));
    }

    [Fact]
    public async Task A_titles_first_pass_is_the_one_its_card_shows()
    {
        // logged_at DESC, id DESC, which is how the board decides which pass is current. The
        // passes are written out of order to test both halves: the newest is the oldest row, and
        // the other two share an instant, so only the id can order them.
        var hollow = await GivenGameAsync("Hollow Knight");

        Clock.UtcNow = new DateTimeOffset(2026, 9, 15, 16, 0, 0, TimeSpan.Zero);
        var newest = await GivenLogEntryAsync(hollow, LogStatus.InProgress);

        Clock.UtcNow = new DateTimeOffset(2026, 8, 1, 16, 0, 0, TimeSpan.Zero);
        var olderFirstWritten = await GivenLogEntryAsync(
            hollow, LogStatus.Completed, completedAt: Eastern(2026, 7, 4));
        var olderSecondWritten = await GivenLogEntryAsync(
            hollow, LogStatus.Completed, completedAt: Eastern(2026, 7, 30));

        var passes = (await ExportAsync()).ShouldHaveSingleItem().Passes;

        passes.Select(pass => pass.Id).ShouldBe([newest, olderSecondWritten, olderFirstWritten]);
        passes[0].Status.ShouldBe((await BoardAsync()).Items.ShouldHaveSingleItem().CurrentStatus);
    }

    [Fact]
    public async Task Each_title_carries_what_the_catalogue_says_about_it()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.Genres = ["Adventure", "Indie", "Platform"];
            game.PrimaryGenre = "Adventure";
            game.Developers = ["Team Cherry"];
            game.HltbMainStoryHours = 27m;
            game.HltbMainExtraHours = 41.6m;
            game.HltbCompletionistHours = 65.59m;
            game.HltbAllStylesHours = 41.82m;
            game.HltbId = 26286;
            await db.SaveChangesAsync(Ct);
        });
        await GivenReleaseWindowAsync(mediaId, new DateOnly(2017, 2, 24), ReleasePrecision.Day);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);

        var title = (await ExportAsync()).ShouldHaveSingleItem();

        title.Title.ShouldBe("Hollow Knight");
        title.Genres.ShouldBe(["Adventure", "Indie", "Platform"]);
        title.PrimaryGenre.ShouldBe("Adventure");
        title.Developers.ShouldBe(["Team Cherry"]);
        title.ReleaseDate.ShouldBe(new DateOnly(2017, 2, 24));
        title.ReleasePrecision.ShouldBe(ReleasePrecision.Day);
        title.HltbMainStoryHours.ShouldBe(27m);
        title.HltbMainExtraHours.ShouldBe(41.6m);
        title.HltbCompletionistHours.ShouldBe(65.59m);
        title.HltbAllStylesHours.ShouldBe(41.82m);
        title.HltbId.ShouldBe(26286);
    }

    [Fact]
    public async Task A_title_nobody_has_asked_a_provider_about_has_no_release_precision()
    {
        // Null, not Unknown: the client writes a blank cell for this and "TBA" for Unknown, and
        // every title from before the release calendar is this one.
        await GivenLogEntryAsync(await GivenGameAsync("Never Asked About"), LogStatus.Backlog);

        var title = (await ExportAsync()).ShouldHaveSingleItem();

        title.ReleasePrecision.ShouldBeNull();
        title.ReleaseDate.ShouldBeNull();
    }

    [Fact]
    public async Task Every_hobbys_title_is_named_and_painted_as_its_card_is()
    {
        // The name and the genres come from the expressions the board's projections use, copied
        // rather than shared because EF cannot reuse one inside another. So this holds the
        // copies to the board's own answer, hobby by hobby, rather than to a value written here.
        var game = await GivenGameAsync("Hollow Knight");
        await WithDbAsync(async db =>
        {
            var row = await db.Games.SingleAsync(candidate => candidate.Id == game, Ct);
            row.Genres = ["Platform"];
            row.PrimaryGenre = "Adventure";
            await db.SaveChangesAsync(Ct);
        });

        var titles = new Dictionary<string, int>
        {
            ["games"] = game,
            ["movies"] = await GivenMovieAsync("Arrival", genres: ["Drama", "Science Fiction"]),
            ["tv"] = await GivenShowAsync("Severance", genres: ["Drama", "Mystery"]),
            ["anime"] = await GivenAnimeAsync(
                "Sousou no Frieren", englishTitle: "Frieren: Beyond Journey's End",
                genres: ["Adventure", "Fantasy"]),
        };

        foreach (var mediaId in titles.Values)
        {
            await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        }

        foreach (var (hobby, mediaId) in titles)
        {
            var card = (await BoardAsync(hobby)).Items.ShouldHaveSingleItem();
            var title = (await ExportAsync(hobby)).ShouldHaveSingleItem();

            title.MediaId.ShouldBe(mediaId, hobby);
            title.Title.ShouldBe(card.Title, hobby);
            title.Genres.ShouldBe(card.Genres);
            title.PrimaryGenre.ShouldBe(card.PrimaryGenre, hobby);
        }

        (await ExportAsync("anime")).Single().Title.ShouldBe("Frieren: Beyond Journey's End");
    }

    // ------------------------------------------------------------------ asking

    [Fact]
    public async Task An_unknown_hobby_is_refused_rather_than_answered_with_nothing()
    {
        (await Client.GetAsync("/api/library/export?hobby=knitting", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Nobody_signed_in_gets_a_401()
    {
        (await AnonymousClient.GetAsync("/api/library/export?hobby=games", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
    }

    // ------------------------------------------------------------------ helpers

    private async Task<IReadOnlyList<ExportTitleDto>> ExportAsync(string hobby = "games")
    {
        var response = await Client.GetAsync($"/api/library/export?hobby={hobby}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await ReadAsync<IReadOnlyList<ExportTitleDto>>(response);
    }

    /// <summary>The titles whose current pass is in a column, in the order the export gave them.</summary>
    private static int[] InColumn(IEnumerable<ExportTitleDto> export, LogStatus status) =>
    [
        .. export
            .Where(title => title.Passes[0].Status == status)
            .Select(title => title.MediaId),
    ];

    private async Task<LibraryPage> BoardAsync(string hobby = "games") =>
        await ReadAsync<LibraryPage>(await Client.GetAsync($"/api/library?hobby={hobby}", Ct));

    private async Task<LibraryPage> ColumnAsync(LogStatus status) =>
        await ReadAsync<LibraryPage>(
            await Client.GetAsync($"/api/library?hobby=games&status={status}", Ct));

    /// <summary>A column's manual ranking, top first, as a drag stores it.</summary>
    private async Task RankAsync(LogStatus status, int[] mediaIds) =>
        (await Client.PutAsJsonAsync(
            "/api/library/order", new ReorderRequest("games", status, mediaIds), Json, Ct))
        .EnsureSuccessStatusCode();

    /// <summary>
    /// That many games in your Backlog, written in one go: a hundred round trips each for the
    /// title and its pass would be most of this test's running time and none of its point.
    /// </summary>
    private Task GivenBacklogOfAsync(int count) => WithDbAsync(async db =>
    {
        for (var index = 1; index <= count; index++)
        {
            var game = new Game
            {
                HobbyId = SeedData.Hobbies.Games,
                SourceId = SeedData.Sources.Igdb,
                ExternalId = index.ToString(),
                Title = $"Game {index}",
            };

            game.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                Status = LogStatus.Backlog,
                LoggedAt = Clock.UtcNow,
            });

            db.Games.Add(game);
        }

        await db.SaveChangesAsync(Ct);
    });

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
