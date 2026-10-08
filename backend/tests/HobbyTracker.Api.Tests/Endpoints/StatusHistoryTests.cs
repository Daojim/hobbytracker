using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// When a title changed column: the history a move used to lose, because a move edits the pass
/// in place.
///
/// Every row here is made through the API. <c>PostgresFixture.CreateDbContext()</c> builds a
/// context with no recorder in it, which is what keeps the arranging below from writing any
/// history of its own — and is why a pass seeded with <c>GivenLogEntryAsync</c> starts with none.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class StatusHistoryTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    /// <summary>Where the stopped clock starts. A literal, for StatusTransitionTests' reason.</summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 16, 0, 0, TimeSpan.Zero);

    // ------------------------------------------------- one row per write path

    [Fact]
    public async Task A_move_records_the_column_a_pass_left_and_the_one_it_reached()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await MoveAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.LogEntryId.ShouldBe(entryId);
        change.FromStatus.ShouldBe(LogStatus.Backlog);
        change.ToStatus.ShouldBe(LogStatus.InProgress);
        change.ChangedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Leaving_completed_records_the_replay_being_made()
    {
        // The finished pass does not change, which is the rule StatusTransitionTests exists to
        // protect, so it has nothing to record. What happened is that a replay began, and the
        // replay's history starts with it.
        var mediaId = await GivenGameAsync("Celeste");
        var finished = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, completedAt: Eastern(2024, 3, 2));

        (await MoveAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.OK);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.LogEntryId.ShouldNotBe(finished);
        change.FromStatus.ShouldBeNull();
        change.ToStatus.ShouldBe(LogStatus.InProgress);
        change.ChangedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Adding_from_a_tile_records_the_column_the_title_arrived_in()
    {
        var mediaId = await GivenGameAsync();

        (await AddAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.Created);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.FromStatus.ShouldBeNull();
        change.ToStatus.ShouldBe(LogStatus.InProgress);
        change.ChangedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Logging_a_pass_records_it_being_made()
    {
        // The journal's own way in, and how the end-to-end suite seeds a board.
        var mediaId = await GivenGameAsync();

        var response = await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(
                mediaId, LogStatus.Completed, null, null, null, Eastern(2026, 9, 1), null),
            Json,
            Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.LogEntryId.ShouldBe((await ReadAsync<LogEntryDto>(response)).Id);
        change.FromStatus.ShouldBeNull();
        change.ToStatus.ShouldBe(LogStatus.Completed);
        change.ChangedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Rewriting_a_pass_into_another_column_records_the_move()
    {
        // Nothing in the app does this — the drawer has no status control — but the route allows
        // it, and a write the recorder never saw is history lost with nothing failing.
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));

        (await PutAsync(entryId, LogStatus.Dropped, startedAt: Eastern(2026, 9, 1)))
            .StatusCode.ShouldBe(HttpStatusCode.OK);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.LogEntryId.ShouldBe(entryId);
        change.FromStatus.ShouldBe(LogStatus.InProgress);
        change.ToStatus.ShouldBe(LogStatus.Dropped);
        change.ChangedAt.ShouldBe(Now);
    }

    // ------------------------------------------- saves that are not moves

    // Each of these saves a pass that changed, so a recorder asking "did a pass change" rather
    // than "did its column change" fails both — by writing a Playing-to-Playing row that
    // ck_status_changes_is_a_change refuses, which is a 500.

    [Fact]
    public async Task Rewriting_a_pass_in_its_own_column_records_nothing()
    {
        // What the drawer sends half a second after every edit: the whole pass, column included.
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));

        (await PutAsync(entryId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1), rating: 8.5m))
            .StatusCode.ShouldBe(HttpStatusCode.OK);

        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Reordering_a_column_records_nothing()
    {
        // A drag inside a column rewrites every card's position: a save full of modified passes,
        // not one of which changed column.
        var first = await GivenGameAsync("First", externalId: "1");
        var second = await GivenGameAsync("Second", externalId: "2");
        await GivenLogEntryAsync(first, LogStatus.Backlog);
        await GivenLogEntryAsync(second, LogStatus.Backlog);

        (await Client.PutAsJsonAsync(
                "/api/library/order",
                new ReorderRequest("games", LogStatus.Backlog, [second, first]),
                Json,
                Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await HistoryAsync()).ShouldBeEmpty();
    }

    // ------------------------------------------------------ a shuffle settles

    // Somebody trying the board out drags a card through every column and back, and none of that
    // is history. A column a pass stayed in for less than SettleWindow is folded into the next
    // move rather than recorded as somewhere the title was.

    [Fact]
    public async Task Two_moves_inside_the_window_leave_one_row()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.InProgress);
        Clock.UtcNow += StatusHistoryRecorder.SettleWindow - TimeSpan.FromSeconds(1);
        await MoveAsync(mediaId, LogStatus.Dropped);

        // Playing lasted a second short of the window, so it was never somewhere the title was:
        // it went from the queue to Dropped, and it did that at the second move.
        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.FromStatus.ShouldBe(LogStatus.Backlog);
        change.ToStatus.ShouldBe(LogStatus.Dropped);
        change.ChangedAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task A_round_trip_inside_the_window_leaves_nothing()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.InProgress);
        (await HistoryAsync()).ShouldHaveSingleItem();

        Clock.UtcNow += TimeSpan.FromMinutes(1);
        await MoveAsync(mediaId, LogStatus.Backlog);

        // Folded into a Backlog-to-Backlog row, which is no move at all, so the row goes.
        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Two_moves_a_whole_window_apart_leave_two_rows()
    {
        // Exactly the window, which pins the side of the line it falls on: a column a pass stayed
        // in for the full ten minutes is somewhere the title really was.
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.InProgress);
        Clock.UtcNow += StatusHistoryRecorder.SettleWindow;
        await MoveAsync(mediaId, LogStatus.Completed);

        var history = await HistoryAsync();
        history.Select(change => (change.FromStatus, change.ToStatus)).ShouldBe(
        [
            (LogStatus.Backlog, LogStatus.InProgress),
            (LogStatus.InProgress, LogStatus.Completed),
        ]);
        history[0].ChangedAt.ShouldBe(Now);
        history[1].ChangedAt.ShouldBe(Now + StatusHistoryRecorder.SettleWindow);
    }

    [Fact]
    public async Task A_shuffle_never_reaches_back_past_a_move_that_settled()
    {
        // Only the latest row is ever folded, and only while it is recent. Playing settled, so a
        // trip to On Hold and straight back is folded away without taking Playing with it.
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.InProgress);
        Clock.UtcNow += TimeSpan.FromHours(2);
        await MoveAsync(mediaId, LogStatus.OnHold);
        Clock.UtcNow += TimeSpan.FromMinutes(1);
        await MoveAsync(mediaId, LogStatus.InProgress);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.FromStatus.ShouldBe(LogStatus.Backlog);
        change.ToStatus.ShouldBe(LogStatus.InProgress);
        change.ChangedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task A_title_added_and_shuffled_inside_the_window_was_made_where_it_settled()
    {
        // The row saying a pass was made folds like any other, and it is the one row a fold can
        // never delete: it came from nowhere, so it cannot have come back to where it started.
        // That is what keeps "every pass made since recording began has one" true.
        var mediaId = await GivenGameAsync();

        await AddAsync(mediaId, LogStatus.Backlog);
        Clock.UtcNow += TimeSpan.FromMinutes(2);
        await MoveAsync(mediaId, LogStatus.InProgress);
        Clock.UtcNow += TimeSpan.FromMinutes(2);
        await MoveAsync(mediaId, LogStatus.Backlog);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.FromStatus.ShouldBeNull();
        change.ToStatus.ShouldBe(LogStatus.Backlog);
        change.ChangedAt.ShouldBe(Clock.UtcNow);
    }

    // ------------------------------------------------------- a finish put back

    // A finish put back never happened, so the history forgets it whatever its age, as it forgets
    // a column a pass spent a minute in: the put-back folds into the row that recorded the finish.
    // Found on 8 October 2026, a mistaken finish noticed six hours later.

    [Fact]
    public async Task A_finish_put_back_hours_later_leaves_nothing_behind()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));

        await MoveAsync(mediaId, LogStatus.Completed);
        (await HistoryAsync()).ShouldHaveSingleItem();

        Clock.UtcNow += TimeSpan.FromHours(6);
        (await PutBackAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.OK);

        // Folded into a Playing-to-Playing row, which is no move at all, so the row goes.
        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_finish_put_back_in_another_column_leaves_only_the_move_that_stood()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));

        await MoveAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow += TimeSpan.FromHours(6);
        await PutBackAsync(mediaId, LogStatus.OnHold);

        // From Playing to On Hold, at the put-back: the finish between them is gone.
        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.LogEntryId.ShouldBe(entryId);
        change.FromStatus.ShouldBe(LogStatus.InProgress);
        change.ToStatus.ShouldBe(LogStatus.OnHold);
        change.ChangedAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task A_title_made_finished_and_put_back_was_made_where_it_was_put()
    {
        // Added straight to Completed, so its one row is the one saying where it was made, which
        // folds like any other and is never deleted.
        var mediaId = await GivenGameAsync();

        await AddAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow += TimeSpan.FromDays(2);
        await PutBackAsync(mediaId, LogStatus.InProgress);

        var change = (await HistoryAsync()).ShouldHaveSingleItem();
        change.FromStatus.ShouldBeNull();
        change.ToStatus.ShouldBe(LogStatus.InProgress);
        change.ChangedAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task A_finish_the_history_never_saw_is_put_back_without_a_row()
    {
        // Finished before recording began, so no row says it reached Completed. A row saying it
        // left would claim the finish the put-back denies; what came before a pass's first row is
        // unknown rather than nothing.
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2026, 9, 1), completedAt: Eastern(2026, 9, 20));

        await PutBackAsync(mediaId, LogStatus.InProgress);

        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Rewriting_a_finished_pass_into_another_column_takes_the_finish_back_too()
    {
        // The recorder knows a put-back by what it is rather than by who asked: the board never
        // moves a finished pass in place, so one that leaves Completed in place has had its finish
        // taken back. Rewriting a pass is the other route that can do that.
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));
        await MoveAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow += TimeSpan.FromHours(6);

        (await PutAsync(entryId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1)))
            .StatusCode.ShouldBe(HttpStatusCode.OK);

        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_replay_still_leaves_the_finish_where_it_was()
    {
        // The other answer to the same question. The finished pass does not change, so its row
        // stands, and the replay is made beside it.
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 1));
        await MoveAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow += TimeSpan.FromHours(6);

        await MoveAsync(mediaId, LogStatus.InProgress);

        (await HistoryAsync()).Select(change => (change.FromStatus, change.ToStatus)).ShouldBe(
        [
            (LogStatus.InProgress, LogStatus.Completed),
            (null, LogStatus.InProgress),
        ]);
    }

    // ---------------------------------------------------------------- cascades

    [Fact]
    public async Task Deleting_a_pass_takes_its_history_with_it()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await MoveAsync(mediaId, LogStatus.InProgress);
        (await HistoryAsync()).ShouldHaveSingleItem();

        (await Client.DeleteAsync($"/api/log-entries/{entryId}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await HistoryAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Removing_a_title_takes_the_history_of_every_pass_and_nobody_elses()
    {
        // Two passes of yours — a finished run and the replay after it — and somebody else's pass
        // on the same shared title, which keeps its history.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2024, 1, 10));
        await MoveAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow += TimeSpan.FromDays(1);
        await MoveAsync(mediaId, LogStatus.InProgress);

        var someoneElse = await GivenUserAsync("Someone Else");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog, userId: someoneElse);
        await MoveAsync(mediaId, LogStatus.InProgress, ClientFor(someoneElse));

        (await HistoryAsync()).Count.ShouldBe(3);

        (await Client.DeleteAsync($"/api/library/{mediaId}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await HistoryAsync()).ShouldHaveSingleItem().LogEntry!.UserId.ShouldBe(someoneElse);
    }

    // ------------------------------------------------------------------ helpers

    private Task<HttpResponseMessage> MoveAsync(
        int mediaId, LogStatus status, HttpClient? client = null) =>
        (client ?? Client).PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<HttpResponseMessage> AddAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync($"/api/library/{mediaId}", new AddToBoardRequest(status), Json, Ct);

    /// <summary>A move out of Completed that says the finish never happened.</summary>
    private Task<HttpResponseMessage> PutBackAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status",
            new StatusTransitionRequest(status, NotFinished: true),
            Json,
            Ct);

    private Task<HttpResponseMessage> PutAsync(
        int entryId, LogStatus status, DateTimeOffset? startedAt, decimal? rating = null) =>
        Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(status, rating, null, startedAt, null, null),
            Json,
            Ct);

    /// <summary>
    /// Every row, oldest first, read straight from the table: nothing serves it yet, and stats
    /// will be the first thing that does.
    /// </summary>
    private Task<List<StatusChange>> HistoryAsync() => WithDbAsync(db => db.StatusChanges
        .Include(change => change.LogEntry)
        .OrderBy(change => change.ChangedAt)
        .ThenBy(change => change.Id)
        .ToListAsync(Ct));
}
