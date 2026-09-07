using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The board, asked about shows.
///
/// <see cref="MoviesBoardTests"/>'s sibling, and it carries that file's warning: the TPT
/// downcasts these exercise live in two terminal projections, and one that stops translating
/// empties a column <b>with no error at all</b>. So several of these assert a column comes back
/// non-empty, because emptiness is the symptom rather than an exception.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class TvBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_board_row_for_a_show_carries_its_genres()
    {
        var mediaId = await GivenShowAsync("Breaking Bad", genres: ["Crime", "Drama"]);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var board = await BoardAsync();

        var row = board.Items.ShouldHaveSingleItem();
        row.Genres.ShouldBe(["Crime", "Drama"]);
        row.PrimaryGenre.ShouldBeNull();
    }

    [Fact]
    public async Task A_board_row_for_a_show_says_how_long_the_whole_run_is()
    {
        // 62 episodes at 45 minutes is 2790 minutes, which is 46.5 hours. The card and
        // sort=length both read this one field, whichever hobby answered it.
        var mediaId = await GivenShowAsync(
            "Breaking Bad", numberOfEpisodes: 62, episodeRuntimeMinutes: 45);

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        (await BoardAsync()).Items.ShouldHaveSingleItem().LengthHours.ShouldBe(46.5m);
    }

    [Fact]
    public async Task A_show_nobody_timed_has_no_length_rather_than_nought()
    {
        var mediaId = await GivenShowAsync("Untimed", numberOfEpisodes: 12);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        (await BoardAsync()).Items.ShouldHaveSingleItem().LengthHours.ShouldBeNull();
    }

    [Fact]
    public async Task A_show_is_never_waiting_on_HowLongToBeat()
    {
        var mediaId = await GivenShowAsync("Breaking Bad");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        // False, not true. The type test in the projection is what makes it so, and getting it
        // wrong would set the TV board polling every three seconds for ever.
        (await BoardAsync()).Items.ShouldHaveSingleItem().HltbPending.ShouldBeFalse();
    }

    [Fact]
    public async Task A_board_row_says_where_you_are()
    {
        var mediaId = await GivenShowAsync("Breaking Bad");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{await LatestEntryIdAsync(mediaId)}",
            new UpdateLogEntryRequest(
                LogStatus.InProgress, null, null, null, null, null, SeasonNumber: 3, EpisodeNumber: 7),
            Json,
            Ct);

        var row = (await BoardAsync()).Items.ShouldHaveSingleItem();
        row.SeasonNumber.ShouldBe(3);
        row.EpisodeNumber.ShouldBe(7);
    }

    [Fact]
    public async Task A_move_answers_with_the_same_progress_the_board_reports()
    {
        // The two terminal projections have to agree. A field populated in one and null in the
        // other flickers on a drag: the move's own response is what the board caches.
        var mediaId = await GivenShowAsync("Breaking Bad");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{await LatestEntryIdAsync(mediaId)}",
            new UpdateLogEntryRequest(
                LogStatus.InProgress, null, null, null, null, null, SeasonNumber: 2, EpisodeNumber: 4),
            Json,
            Ct);

        var moved = await ReadAsync<LibraryItemDto>(await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status",
            new StatusTransitionRequest(LogStatus.Completed),
            Json,
            Ct));

        moved.SeasonNumber.ShouldBe(2);
        moved.EpisodeNumber.ShouldBe(4);

        var row = (await BoardAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
        row.SeasonNumber.ShouldBe(2);
        row.EpisodeNumber.ShouldBe(4);
    }

    [Fact]
    public async Task Dragging_back_to_the_backlog_forgets_where_you_were()
    {
        var mediaId = await GivenShowAsync("Breaking Bad");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{await LatestEntryIdAsync(mediaId)}",
            new UpdateLogEntryRequest(
                LogStatus.InProgress, null, null, null, null, null, SeasonNumber: 3, EpisodeNumber: 7),
            Json,
            Ct);

        await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(LogStatus.Backlog), Json, Ct);

        // The same rule that clears both timestamps: back in the queue means not started, and a
        // card there still reading S3 E7 would be the same kind of lie.
        var row = (await BoardAsync(LogStatus.Backlog)).Items.ShouldHaveSingleItem();
        row.SeasonNumber.ShouldBeNull();
        row.EpisodeNumber.ShouldBeNull();
    }

    [Fact]
    public async Task A_rewatch_starts_at_the_beginning()
    {
        // Leaving Completed inserts a new pass rather than editing one, and the new pass carries
        // no progress — which is what makes a rewatch start over with no code saying so.
        var mediaId = await GivenShowAsync("Breaking Bad");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{await LatestEntryIdAsync(mediaId)}",
            new UpdateLogEntryRequest(
                LogStatus.InProgress, null, null, null, null, null, SeasonNumber: 5, EpisodeNumber: 16),
            Json,
            Ct);

        await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(LogStatus.Completed), Json, Ct);

        var replay = await ReadAsync<LibraryItemDto>(await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status",
            new StatusTransitionRequest(LogStatus.InProgress),
            Json,
            Ct));

        replay.SeasonNumber.ShouldBeNull();
        replay.EpisodeNumber.ShouldBeNull();
    }

    [Fact]
    public async Task One_sort_orders_all_three_boards_without_any_of_them_knowing_the_others()
    {
        await GivenLogEntryAsync(
            await GivenShowAsync("Long Show", numberOfEpisodes: 62, episodeRuntimeMinutes: 45),
            LogStatus.Completed);

        await GivenLogEntryAsync(
            await GivenShowAsync("Short Show", externalId: "2", numberOfEpisodes: 6, episodeRuntimeMinutes: 50),
            LogStatus.Completed);

        await GivenLogEntryAsync(
            await GivenShowAsync("Untimed Show", externalId: "3"), LogStatus.Completed);

        await GivenLogEntryAsync(await GivenMovieAsync("A Film", runtimeMinutes: 116), LogStatus.Completed);
        await GivenLogEntryAsync(await GivenGameAsync("A Game"), LogStatus.Completed);

        var shows = await BoardAsync(LogStatus.Completed, LibrarySort.Length);

        // Non-empty is half the assertion: a downcast that stopped translating would answer with
        // nothing at all and no error.
        shows.Items.ShouldNotBeEmpty();
        shows.Items.Select(item => item.Title).ShouldBe(["Short Show", "Long Show", "Untimed Show"]);

        var films = await BoardAsync(LogStatus.Completed, LibrarySort.Length, hobby: "movies");
        films.Items.ShouldHaveSingleItem().Title.ShouldBe("A Film");

        var games = await BoardAsync(LogStatus.Completed, LibrarySort.Length, hobby: "games");
        games.Items.ShouldHaveSingleItem().Title.ShouldBe("A Game");
    }

    private async Task<int> LatestEntryIdAsync(int mediaId)
    {
        var entries = await ReadAsync<PagedResult<LogEntryDto>>(
            await Client.GetAsync($"/api/log-entries?mediaId={mediaId}", Ct));

        return entries.Items[0].Id;
    }

    private async Task<PagedResult<LibraryItemDto>> BoardAsync(
        LogStatus? status = null, LibrarySort? sort = null, string hobby = "tv")
    {
        var query = $"/api/library?hobby={hobby}";

        if (status is { } wanted)
        {
            query += $"&status={wanted}";
        }

        if (sort is { } ordering)
        {
            query += $"&sort={ordering.ToString().ToLowerInvariant()}";
        }

        return await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(query, Ct));
    }
}
