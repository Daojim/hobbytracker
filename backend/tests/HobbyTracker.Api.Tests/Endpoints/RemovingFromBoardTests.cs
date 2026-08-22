using System.Net;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Taking a title off the board — what closing a Backlog card does.
///
/// Dropping is for a game you started and gave up on. A game you never began has nothing to
/// abandon, so closing it deletes the pass instead of moving it to a column that would claim
/// you played it.
///
/// One rule covers both outcomes: the current pass goes, and only that one. A title with a
/// single pass leaves the board because the library is titles you have logged something
/// against; a title with an older completion underneath goes back to showing that.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class RemovingFromBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Removing_the_only_pass_takes_the_title_off_the_board()
    {
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await GetColumnAsync(LogStatus.Backlog)).Items.ShouldBeEmpty();
        (await EntriesAsync(mediaId)).ShouldBeEmpty();
    }

    [Fact]
    public async Task Removing_the_only_pass_leaves_the_title_in_the_catalog()
    {
        // Un-logging something is not the same as forgetting it exists: the media row is what a
        // search would find again, and re-adding it must not mean a second row.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await RemoveAsync(mediaId);

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task Removing_a_backlog_pass_over_a_completion_puts_the_title_back_in_completed()
    {
        // Dragging a finished game back to Backlog inserts a fresh entry rather than editing the
        // completion. Changing your mind about the replay has to undo exactly that much.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await GetColumnAsync(LogStatus.Backlog)).Items.ShouldBeEmpty();
        var completed = (await GetColumnAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
        completed.MediaId.ShouldBe(mediaId);
        completed.EntryCount.ShouldBe(1);
    }

    [Fact]
    public async Task Removing_a_pass_takes_the_current_one_and_leaves_the_history_alone()
    {
        var mediaId = await GivenGameAsync("Celeste");
        var completion = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        await RemoveAsync(mediaId);

        var surviving = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        surviving.Id.ShouldBe(completion);
        surviving.CompletedAt.ShouldNotBeNull();
    }

    [Fact]
    public async Task Removing_a_pass_takes_its_notes_with_it()
    {
        // A note belongs to the pass it was written during, which is why the foreign key
        // cascades. Nothing here should have to remember that separately.
        var mediaId = await GivenGameAsync("Celeste");
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await WithDbAsync(async db =>
        {
            db.Notes.Add(new Note { LogEntryId = entryId, Body = "Heard good things." });
            await db.SaveChangesAsync(Ct);
        });

        await RemoveAsync(mediaId);

        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task Removing_from_a_title_that_has_never_been_logged_is_a_404()
    {
        // In the catalog but not on the board, so there is no pass to take off it.
        var mediaId = await GivenGameAsync();

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Removing_from_an_unknown_title_is_a_404()
    {
        (await RemoveAsync(999_999)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private Task<HttpResponseMessage> RemoveAsync(int mediaId) =>
        Client.DeleteAsync($"/api/library/{mediaId}/current", Ct);

    private Task<List<LogEntry>> EntriesAsync(int mediaId) => WithDbAsync(db => db.LogEntries
        .Where(entry => entry.MediaId == mediaId)
        .OrderBy(entry => entry.Id)
        .ToListAsync(Ct));

    private async Task<PagedResult<LibraryItemDto>> GetColumnAsync(LogStatus status) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(
            await Client.GetAsync($"/api/library?hobby=games&status={status}", Ct));
}
