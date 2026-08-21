using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The library is what you have logged, not what happens to be cached.
///
/// That distinction is the whole reason this endpoint exists separately from search: every
/// IGDB query writes its results into `media` as a side effect, so the catalog fills up with
/// everything ever typed into a search box. Confusing the two would make the home screen a
/// list of things the user never asked to keep.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LibraryEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Is_empty_when_nothing_has_been_logged_however_full_the_catalog_is()
    {
        // Fill the catalog the way a few searches would.
        Igdb.DefaultResults =
        [
            .. Enumerable.Range(1, 15).Select(i => FakeIgdbClient.Game(i, $"Game {i}")),
        ];
        await Client.GetAsync("/api/games?search=anything", Ct);

        var page = await GetPageAsync("/api/library");

        // Fifteen rows in media, nothing logged, so the library is empty.
        page.Total.ShouldBe(0);
        page.Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task Includes_a_title_once_something_is_logged_against_it()
    {
        var logged = await GivenGameAsync("Hollow Knight", externalId: "1", coverUrl: "https://cover");
        await GivenGameAsync("Never Played", externalId: "2");

        await GivenLogEntryAsync(logged, LogStatus.Completed, rating: 9.5m,
            completedAt: Eastern(2026, 5, 1));

        var page = await GetPageAsync("/api/library");

        var item = page.Items.ShouldHaveSingleItem();
        item.MediaId.ShouldBe(logged);
        item.Title.ShouldBe("Hollow Knight");
        item.CoverUrl.ShouldBe("https://cover");
        item.Hobby.ShouldBe("games");
        item.CurrentStatus.ShouldBe(LogStatus.Completed);
        item.EntryCount.ShouldBe(1);
        item.LatestRating.ShouldBe(9.5m);
        item.LastActivity.ShouldBe(Eastern(2026, 5, 1));
    }

    [Fact]
    public async Task Current_status_comes_from_the_most_recent_entry()
    {
        var mediaId = await GivenGameAsync();

        await GivenLogEntryAsync(mediaId, LogStatus.Completed, rating: 8m,
            startedAt: Eastern(2024, 1, 1), completedAt: Eastern(2024, 3, 1));
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress,
            startedAt: Eastern(2026, 8, 1));

        var item = (await GetPageAsync("/api/library")).Items.ShouldHaveSingleItem();

        // A replay under way beats an old completion. Taking the first entry, or any entry,
        // would report this game as finished while the user is mid-playthrough.
        item.CurrentStatus.ShouldBe(LogStatus.InProgress);
        item.EntryCount.ShouldBe(2);
        item.LatestRating.ShouldBeNull();
    }

    [Fact]
    public async Task Breaks_a_tie_on_insertion_order_when_two_passes_share_an_instant()
    {
        var mediaId = await GivenGameAsync();

        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenLogEntryAsync(mediaId, LogStatus.Dropped);

        var item = (await GetPageAsync("/api/library")).Items.ShouldHaveSingleItem();

        // Both entries are stamped from the stopped clock, so logged_at cannot separate them
        // and the id has to. That is not a contrived case: it is what every fixture in this
        // suite looks like, so the tie-break carries the whole ordering here.
        item.CurrentStatus.ShouldBe(LogStatus.Dropped);
    }

    [Fact]
    public async Task An_undated_pass_still_wins_when_it_was_recorded_later()
    {
        var mediaId = await GivenGameAsync();

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 8, 1));
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var item = (await GetPageAsync("/api/library")).Items.ShouldHaveSingleItem();

        // Ordering is logged_at DESC, id DESC. This once read the other way -- a dated entry
        // was taken as better evidence than a later undated one -- and it was wrong: putting a
        // game you had started back into the backlog writes an entry with no dates by rule, so
        // the board went on insisting you were still playing it.
        item.CurrentStatus.ShouldBe(LogStatus.Backlog);
    }

    [Fact]
    public async Task The_board_and_the_game_detail_agree_about_which_pass_is_current()
    {
        // Three places order a title's entries -- the board projection, the transition lookup,
        // and game detail. CLAUDE.md already warns that the first two drifting apart means the
        // board moves one entry and displays another; a third consumer makes that warning
        // cheap to ignore, so it is pinned here instead.
        var mediaId = await GivenGameAsync();

        await GivenLogEntryAsync(mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var item = (await GetPageAsync("/api/library")).Items.ShouldHaveSingleItem();
        var detail = await ReadAsync<GameDetailDto>(
            await Client.GetAsync($"/api/games/{mediaId}", Ct));

        detail.LogEntries.Count.ShouldBe(2);
        detail.LogEntries[0].Status.ShouldBe(item.CurrentStatus);
    }

    [Fact]
    public async Task Filters_on_current_status_not_any_status()
    {
        var replayed = await GivenGameAsync("Replayed", externalId: "1");
        await GivenLogEntryAsync(replayed, LogStatus.Completed, startedAt: Eastern(2024, 1, 1));
        await GivenLogEntryAsync(replayed, LogStatus.InProgress, startedAt: Eastern(2026, 8, 1));

        var finished = await GivenGameAsync("Finished", externalId: "2");
        await GivenLogEntryAsync(finished, LogStatus.Completed, startedAt: Eastern(2025, 1, 1));

        var completed = await GetPageAsync("/api/library?status=Completed");

        // The replayed game has a Completed entry in its history but is not currently
        // completed, so it must not show up under that filter.
        completed.Items.ShouldHaveSingleItem().Title.ShouldBe("Finished");

        var inProgress = await GetPageAsync("/api/library?status=InProgress");
        inProgress.Items.ShouldHaveSingleItem().Title.ShouldBe("Replayed");
    }

    [Fact]
    public async Task Filters_by_hobby()
    {
        var game = await GivenGameAsync("A Game");
        await GivenLogEntryAsync(game, LogStatus.Completed);

        var film = await GivenNonGameMediaAsync(SeedData.Hobbies.Movies, "A Film");
        await GivenLogEntryAsync(film, LogStatus.Completed);

        (await GetPageAsync("/api/library")).Total.ShouldBe(2);

        var games = await GetPageAsync("/api/library?hobby=games");
        games.Items.ShouldHaveSingleItem().Title.ShouldBe("A Game");

        var movies = await GetPageAsync("/api/library?hobby=movies");
        movies.Items.ShouldHaveSingleItem().Title.ShouldBe("A Film");
    }

    [Fact]
    public async Task Rejects_an_unknown_hobby()
    {
        (await Client.GetAsync("/api/library?hobby=underwater-basket-weaving", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Pages_through_the_collection()
    {
        foreach (var index in Enumerable.Range(1, 5))
        {
            var mediaId = await GivenGameAsync($"Game {index}", externalId: index.ToString());
            await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        }

        var page = await GetPageAsync("/api/library?page=2&pageSize=2");

        page.Total.ShouldBe(5);
        page.Page.ShouldBe(2);
        page.PageSize.ShouldBe(2);
        page.Items.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Counts_each_title_once_however_many_replays_it_has()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var page = await GetPageAsync("/api/library");

        // A naive join would return the same game three times.
        page.Total.ShouldBe(1);
        page.Items.ShouldHaveSingleItem().EntryCount.ShouldBe(3);
    }

    private async Task<PagedResult<LibraryItemDto>> GetPageAsync(string url) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
}
