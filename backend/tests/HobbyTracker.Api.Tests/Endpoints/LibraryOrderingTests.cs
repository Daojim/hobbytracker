using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Column ordering: the user's manual ranking, the read-only sort modes, and the year picker.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LibraryOrderingTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // --------------------------------------------------------- manual ranking

    [Fact]
    public async Task Newly_added_titles_appear_at_the_top()
    {
        await GivenBacklogAsync("First", "1");
        await GivenBacklogAsync("Second", "2");
        await GivenBacklogAsync("Third", "3");

        var column = await GetColumnAsync(LogStatus.Backlog);

        // min(position) - 1 puts each new entry on top without renumbering the rest. Adding a
        // game and not seeing it would be the worst possible first impression of the board.
        column.Items.Select(item => item.Title).ShouldBe(["Third", "Second", "First"]);
    }

    [Fact]
    public async Task Reordering_a_column_stores_the_order_sent()
    {
        var first = await GivenBacklogAsync("First", "1");
        var second = await GivenBacklogAsync("Second", "2");
        var third = await GivenBacklogAsync("Third", "3");

        var response = await ReorderAsync(LogStatus.Backlog, [second, third, first]);
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var column = await GetColumnAsync(LogStatus.Backlog);
        column.Items.Select(item => item.MediaId).ShouldBe([second, third, first]);
    }

    [Fact]
    public async Task A_stored_ranking_survives_a_reload()
    {
        var first = await GivenBacklogAsync("First", "1");
        var second = await GivenBacklogAsync("Second", "2");

        await ReorderAsync(LogStatus.Backlog, [first, second]);

        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.MediaId).ShouldBe([first, second]);
    }

    [Fact]
    public async Task Reordering_ignores_titles_that_have_since_left_the_column()
    {
        var stays = await GivenBacklogAsync("Stays", "1");
        var moved = await GivenBacklogAsync("Moved", "2");

        // Simulates a real race: the card was dragged to Playing in another tab between the
        // board loading and this drop landing. Rejecting the whole request would strand the
        // user's reorder over something harmless.
        await MoveAsync(moved, LogStatus.InProgress);

        var response = await ReorderAsync(LogStatus.Backlog, [moved, stays]);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await GetColumnAsync(LogStatus.Backlog)).Items.ShouldHaveSingleItem().MediaId.ShouldBe(stays);
    }

    [Fact]
    public async Task Reordering_rejects_an_empty_list()
    {
        (await ReorderAsync(LogStatus.Backlog, [])).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ------------------------------------------------------------- sort modes

    [Fact]
    public async Task Manual_is_the_default_sort()
    {
        var first = await GivenBacklogAsync("Zebra", "1");
        var second = await GivenBacklogAsync("Alpha", "2");

        await ReorderAsync(LogStatus.Backlog, [first, second]);

        // No sort parameter, so the user's ranking wins over anything alphabetical.
        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.Title).ShouldBe(["Zebra", "Alpha"]);
    }

    [Fact]
    public async Task Sorting_by_title_is_alphabetical()
    {
        await GivenBacklogAsync("Zebra", "1");
        await GivenBacklogAsync("Alpha", "2");
        await GivenBacklogAsync("Mango", "3");

        var column = await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Title);

        column.Items.Select(item => item.Title).ShouldBe(["Alpha", "Mango", "Zebra"]);
    }

    [Fact]
    public async Task Sorting_by_added_puts_the_newest_first()
    {
        await GivenBacklogAsync("Oldest", "1");
        await GivenBacklogAsync("Newest", "2");

        var column = await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Added);

        column.Items.Select(item => item.Title).ShouldBe(["Newest", "Oldest"]);
    }

    [Fact]
    public async Task Sorting_by_rating_puts_the_best_first_and_unrated_last()
    {
        await GivenCompletedAsync("Good", "1", rating: 8m);
        await GivenCompletedAsync("Unrated", "2", rating: null);
        await GivenCompletedAsync("Great", "3", rating: 9.5m);

        var column = await GetColumnAsync(LogStatus.Completed, sort: LibrarySort.Rating);

        column.Items.Select(item => item.Title).ShouldBe(["Great", "Good", "Unrated"]);
    }

    [Fact]
    public async Task Viewing_a_column_sorted_does_not_disturb_the_stored_ranking()
    {
        var zebra = await GivenBacklogAsync("Zebra", "1");
        var alpha = await GivenBacklogAsync("Alpha", "2");
        await ReorderAsync(LogStatus.Backlog, [zebra, alpha]);

        // Look at it alphabetically...
        (await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Title)).Items
            .Select(item => item.Title).ShouldBe(["Alpha", "Zebra"]);

        // ...then switch back. The ranking must be exactly as it was left: sort modes are
        // read-only views, which is the whole reason dragging is disabled in them.
        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.Title).ShouldBe(["Zebra", "Alpha"]);
    }

    // ------------------------------------------------------------ year filter

    [Fact]
    public async Task The_year_narrows_completed_titles_to_that_year()
    {
        await GivenCompletedAsync("Old", "1", completedOn: Eastern(2024, 6, 1));
        await GivenCompletedAsync("Recent", "2", completedOn: Eastern(2026, 6, 1));

        var column = await GetColumnAsync(LogStatus.Completed, year: 2026);

        column.Items.ShouldHaveSingleItem().Title.ShouldBe("Recent");
    }

    [Fact]
    public async Task Completions_with_no_date_appear_only_when_no_year_is_asked_for()
    {
        await GivenCompletedAsync("Undated", "1", completedOn: null);

        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
        (await GetColumnAsync(LogStatus.Completed, year: 2026)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task The_years_endpoint_lists_each_year_with_completions_once()
    {
        await GivenCompletedAsync("A", "1", completedOn: Eastern(2024, 6, 1));
        await GivenCompletedAsync("B", "2", completedOn: Eastern(2026, 1, 5));
        await GivenCompletedAsync("C", "3", completedOn: Eastern(2026, 8, 9));
        await GivenBacklogAsync("Unplayed", "4");

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));

        // Newest first, deduplicated, and a backlog title contributes nothing.
        years.ShouldBe([2026, 2024]);
    }

    [Fact]
    public async Task A_completion_late_on_new_years_eve_belongs_to_the_year_it_was_here()
    {
        // 8pm on the 31st here is already the 1st in UTC. Extracting the year from the stored
        // instant without saying in which zone would file this under 2027 — and the year view
        // would quietly lose a game every time someone finished one on New Year's Eve.
        await GivenCompletedAsync("Midnight Run", "1", completedOn: Eastern(2026, 12, 31, 20, 0));

        (await GetColumnAsync(LogStatus.Completed, year: 2026)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Midnight Run");
        (await GetColumnAsync(LogStatus.Completed, year: 2027)).Items.ShouldBeEmpty();

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));
        years.ShouldBe([2026]);
    }

    // ----------------------------------------------------------------- helpers

    private async Task<int> GivenBacklogAsync(string title, string externalId)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null),
            Json,
            Ct);
        return mediaId;
    }

    private async Task<int> GivenCompletedAsync(
        string title, string externalId, decimal? rating = null, DateTimeOffset? completedOn = null)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Completed, rating, null, null, completedOn),
            Json,
            Ct);
        return mediaId;
    }

    private Task<HttpResponseMessage> MoveAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<HttpResponseMessage> ReorderAsync(LogStatus status, IReadOnlyList<int> mediaIds) =>
        Client.PutAsJsonAsync(
            "/api/library/order", new ReorderRequest("games", status, mediaIds), Json, Ct);

    private async Task<PagedResult<LibraryItemDto>> GetColumnAsync(
        LogStatus status, LibrarySort? sort = null, int? year = null)
    {
        var url = $"/api/library?hobby=games&status={status}";
        if (sort is { } chosen) url += $"&sort={chosen}";
        if (year is { } wanted) url += $"&year={wanted}";

        return await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
    }
}
