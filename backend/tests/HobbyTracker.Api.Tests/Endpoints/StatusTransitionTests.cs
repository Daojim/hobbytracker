using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Moving a title between board columns.
///
/// The board names a target column and nothing else; every rule about which entry gets touched
/// and which dates get filled in lives here, on the server, where it can be tested.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class StatusTransitionTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    /// <summary>
    /// The day the stopped clock sits on. A literal rather than a recomputation of whatever the
    /// server just did: reproducing the conversion here would let both sides be wrong together,
    /// and reading the wall clock at assert time — which this used to do — made every date
    /// assertion below quietly dependent on the run not straddling a midnight.
    /// </summary>
    /// <summary>
    /// The moment the stopped clock sits at. A literal rather than a recomputation of whatever
    /// the server just did: reproducing the arithmetic here would let both sides be wrong
    /// together, and reading the wall clock at assert time — which this used to do — made every
    /// assertion below quietly dependent on the run not straddling a midnight.
    /// </summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 16, 0, 0, TimeSpan.Zero);

    // ------------------------------------------------- editing the current entry

    [Fact]
    public async Task Starting_a_game_stamps_todays_date()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var response = await MoveAsync(mediaId, LogStatus.InProgress);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.InProgress);
        entry.StartedAt.ShouldBe(Now);
        entry.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Moving_back_to_the_backlog_clears_both_dates()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 8, 1));

        await MoveAsync(mediaId, LogStatus.Backlog);

        // Putting something back in the backlog means you have not started it. Leaving a start
        // date behind would make the year view claim you played it.
        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Backlog);
        entry.StartedAt.ShouldBeNull();
        entry.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Finishing_a_game_stamps_the_completion_date_and_keeps_the_start()
    {
        var mediaId = await GivenGameAsync();
        var started = Eastern(2026, 7, 2);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: started);

        await MoveAsync(mediaId, LogStatus.Completed);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Completed);
        entry.StartedAt.ShouldBe(started);
        entry.CompletedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Finishing_straight_from_the_backlog_leaves_the_start_date_empty()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.Completed);

        // Inventing a start date would be a lie, and the check constraint is satisfied either
        // way since started_at is null.
        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.StartedAt.ShouldBeNull();
        entry.CompletedAt.ShouldBe(Now);
    }

    [Fact]
    public async Task Dropping_a_game_leaves_its_dates_alone()
    {
        var mediaId = await GivenGameAsync();
        var started = Eastern(2026, 5, 5);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: started);

        await MoveAsync(mediaId, LogStatus.Dropped);

        // You did start it. Abandoning it does not undo that.
        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Dropped);
        entry.StartedAt.ShouldBe(started);
    }

    [Fact]
    public async Task Un_dropping_keeps_the_day_you_actually_started()
    {
        var mediaId = await GivenGameAsync();
        var started = Eastern(2026, 5, 5);
        await GivenLogEntryAsync(mediaId, LogStatus.Dropped, startedAt: started);

        await MoveAsync(mediaId, LogStatus.InProgress);

        // started_at is set only when it is null. Overwriting it here would quietly rewrite
        // history every time you picked a game back up.
        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.InProgress);
        entry.StartedAt.ShouldBe(started);
    }

    [Fact]
    public async Task Moving_to_the_column_it_is_already_in_changes_nothing()
    {
        var mediaId = await GivenGameAsync();
        var started = Eastern(2026, 5, 5);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: started);

        var response = await MoveAsync(mediaId, LogStatus.InProgress);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.StartedAt.ShouldBe(started);
    }

    // --------------------------------------------------- the day it is here

    // The server used to ask UTC what day it was. Eastern runs four to five hours behind, so
    // every evening there is a window in which UTC has already rolled over and the journal
    // recorded tomorrow — and evening is when someone actually finishes a game.

    [Fact]
    public async Task Finishing_in_the_evening_records_tonight_not_tomorrow()
    {
        // 01:30 UTC on the 21st is 21:30 on the 20th in New York. An ordinary Thursday evening.
        Clock.UtcNow = new DateTimeOffset(2026, 8, 21, 1, 30, 0, TimeSpan.Zero);

        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 8, 1));

        await MoveAsync(mediaId, LogStatus.Completed);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        // The instant is simply the instant; the question a plain date could not answer is
        // which day it belongs to, and here that is still the 20th.
        Journal.DayOf(entry.CompletedAt!.Value).ShouldBe(new DateOnly(2026, 8, 20));
    }

    [Fact]
    public async Task Starting_in_the_evening_records_tonight_not_tomorrow()
    {
        Clock.UtcNow = new DateTimeOffset(2026, 8, 21, 1, 30, 0, TimeSpan.Zero);

        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.InProgress);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        Journal.DayOf(entry.StartedAt!.Value).ShouldBe(new DateOnly(2026, 8, 20));
    }

    [Fact]
    public async Task The_offset_widens_in_winter_when_daylight_saving_ends()
    {
        // Same wall-clock evening in January, but Eastern is UTC-5 rather than UTC-4, so the
        // window opens an hour earlier. 04:30 UTC is 23:30 on the 14th.
        Clock.UtcNow = new DateTimeOffset(2026, 1, 15, 4, 30, 0, TimeSpan.Zero);

        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await MoveAsync(mediaId, LogStatus.Completed);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        Journal.DayOf(entry.CompletedAt!.Value).ShouldBe(new DateOnly(2026, 1, 14));
    }

    // ------------------------------------------------------- leaving Completed

    [Fact]
    public async Task Replaying_a_finished_game_starts_a_new_entry_and_keeps_the_old_one()
    {
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, rating: 9.6m,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));

        await MoveAsync(mediaId, LogStatus.InProgress);

        var entries = await EntriesAsync(mediaId);
        entries.Count.ShouldBe(2);

        // The 2024 playthrough is untouched -- dates, rating and all. This is the single most
        // important behaviour on the board: editing in place here would silently destroy the
        // only record that the game was ever finished.
        var original = entries[0];
        original.Status.ShouldBe(LogStatus.Completed);
        original.StartedAt.ShouldBe(Eastern(2024, 1, 10));
        original.CompletedAt.ShouldBe(Eastern(2024, 3, 2));
        original.Rating.ShouldBe(9.6m);

        var replay = entries[1];
        replay.Status.ShouldBe(LogStatus.InProgress);
        replay.StartedAt.ShouldBe(Now);
        replay.CompletedAt.ShouldBeNull();
        replay.Rating.ShouldBeNull();
    }

    [Fact]
    public async Task Sending_a_finished_game_back_to_the_backlog_also_starts_a_new_entry()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, completedAt: Eastern(2024, 3, 2));

        await MoveAsync(mediaId, LogStatus.Backlog);

        var entries = await EntriesAsync(mediaId);
        entries.Count.ShouldBe(2);
        entries[0].Status.ShouldBe(LogStatus.Completed);
        entries[1].Status.ShouldBe(LogStatus.Backlog);
        entries[1].StartedAt.ShouldBeNull();
        entries[1].CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task The_board_shows_the_replay_not_the_old_completion()
    {
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, startedAt: Eastern(2024, 1, 10),
            completedAt: Eastern(2024, 3, 2));

        var response = await MoveAsync(mediaId, LogStatus.InProgress);

        var item = await ReadAsync<LibraryItemDto>(response);
        item.MediaId.ShouldBe(mediaId);
        item.CurrentStatus.ShouldBe(LogStatus.InProgress);
        item.EntryCount.ShouldBe(2);
    }

    [Fact]
    public async Task A_replay_lands_at_the_top_of_its_new_column()
    {
        // Two games already sitting in the backlog.
        foreach (var index in new[] { 1, 2 })
        {
            var existing = await GivenGameAsync($"Game {index}", externalId: index.ToString());
            await MoveAsync(existing, LogStatus.Backlog);
        }

        var replayed = await GivenGameAsync("Replayed", externalId: "3");
        await GivenLogEntryAsync(replayed, LogStatus.Completed, completedAt: Eastern(2024, 1, 1));

        await MoveAsync(replayed, LogStatus.Backlog);

        var backlog = await GetColumnAsync(LogStatus.Backlog);
        backlog.Items[0].Title.ShouldBe("Replayed");
    }

    // ------------------------------------------------------------------ errors

    [Fact]
    public async Task Moving_a_title_that_has_never_been_logged_is_a_404()
    {
        var mediaId = await GivenGameAsync();

        // It is in the catalog but not on the board, so there is no entry to move.
        (await MoveAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Moving_an_unknown_title_is_a_404()
    {
        (await MoveAsync(999_999, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task A_finished_game_sent_back_to_the_backlog_stays_there()
    {
        // The ordinary route to Completed is Backlog -> Playing -> Completed, so a completion
        // almost always carries a start date. The Backlog entry that supersedes it has neither
        // date by rule, and an ordering that preferred a dated entry would keep answering
        // "Completed" -- leaving the card where it was and adding another orphan entry on
        // every retry.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));

        var item = await ReadAsync<LibraryItemDto>(await MoveAsync(mediaId, LogStatus.Backlog));

        item.CurrentStatus.ShouldBe(LogStatus.Backlog);
        (await GetColumnAsync(LogStatus.Backlog)).Items.ShouldHaveSingleItem()
            .MediaId.ShouldBe(mediaId);
        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_finished_game_that_is_dropped_stays_dropped()
    {
        // Dropped leaves timestamps alone, so the new entry has none at all -- the same shape
        // as the Backlog case above, and broken the same way.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));

        var item = await ReadAsync<LibraryItemDto>(await MoveAsync(mediaId, LogStatus.Dropped));

        item.CurrentStatus.ShouldBe(LogStatus.Dropped);
        (await GetColumnAsync(LogStatus.Dropped)).Items.ShouldHaveSingleItem()
            .MediaId.ShouldBe(mediaId);
        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task Dropping_a_finished_game_twice_does_not_pile_up_entries()
    {
        // The consequence of the bug above rather than a restatement of it: while the board
        // still reads "Completed", every further drag looks like leaving Completed again and
        // inserts one more entry.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));

        await MoveAsync(mediaId, LogStatus.Backlog);
        await MoveAsync(mediaId, LogStatus.Backlog);

        // The second move is a no-op: the game is already in the column it names.
        (await EntriesAsync(mediaId)).Count.ShouldBe(2);
    }

    private Task<HttpResponseMessage> MoveAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<List<LogEntry>> EntriesAsync(int mediaId) => WithDbAsync(db => db.LogEntries
        .Where(entry => entry.MediaId == mediaId)
        .OrderBy(entry => entry.Id)
        .ToListAsync(Ct));

    private async Task<PagedResult<LibraryItemDto>> GetColumnAsync(LogStatus status) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(
            await Client.GetAsync($"/api/library?hobby=games&status={status}", Ct));
}
