using System.Net;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Taking a title off the board — what <em>Remove from board</em> does.
///
/// Every pass of yours goes, not just the current one. This used to delete the current pass
/// alone, which was defensible on paper and wrong to use: a title replayed five times took five
/// presses to remove, each looking like a failure because the card sprang back to the column the
/// pass underneath was in. "Remove from board" now means what it says.
///
/// The pass-at-a-time delete still exists and is the drawer's — <c>DELETE /api/log-entries/{id}
/// </c> — where the pass being deleted is named and visible. That is the right place for it: the
/// board shows one card per title and has no vocabulary for which pass you meant.
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
    public async Task Removing_takes_every_pass_rather_than_the_current_one()
    {
        // The one this endpoint changed for. A game finished, replayed and dropped carries three
        // passes; deleting the newest would put the card back in Completed, which reads as the
        // remove having failed — and reads that way again on the next press, and the next.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 1, 5));
        await GivenLogEntryAsync(mediaId, LogStatus.Dropped);

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await EntriesAsync(mediaId)).ShouldBeEmpty();
        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldBeEmpty();
        (await GetColumnAsync(LogStatus.Dropped)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task Removing_takes_the_notes_of_every_pass_with_it()
    {
        // A note belongs to the pass it was written during, which is why the foreign key
        // cascades. Nothing here should have to remember that separately — including for the
        // passes underneath, which is what changed when this stopped being a one-pass delete.
        var mediaId = await GivenGameAsync("Celeste");
        var completion = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, completedAt: Eastern(2024, 3, 2));
        var replay = await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenNoteAsync(completion, "Loved it the first time.");
        await GivenNoteAsync(replay, "Going back in.");

        await RemoveAsync(mediaId);

        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task Removing_leaves_somebody_elses_passes_on_their_own_board()
    {
        // The title is shared; the passes are not. Deleting every pass on a media row rather
        // than every pass of *yours* would take a stranger's playthrough with it, and they would
        // have no way of telling what happened.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        var theirs = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, userId: await GivenUserAsync("Somebody Else"));

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var surviving = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        surviving.Id.ShouldBe(theirs);
    }

    [Fact]
    public async Task Removing_a_title_that_has_never_been_logged_is_a_404()
    {
        // In the catalog but not on the board, so there is nothing to take off it.
        var mediaId = await GivenGameAsync();

        (await RemoveAsync(mediaId)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Removing_an_unknown_title_is_a_404()
    {
        (await RemoveAsync(999_999)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private Task<HttpResponseMessage> RemoveAsync(int mediaId) =>
        Client.DeleteAsync($"/api/library/{mediaId}", Ct);

    private Task<List<LogEntry>> EntriesAsync(int mediaId) => WithDbAsync(db => db.LogEntries
        .Where(entry => entry.MediaId == mediaId)
        .OrderBy(entry => entry.Id)
        .ToListAsync(Ct));

    private async Task<PagedResult<LibraryItemDto>> GetColumnAsync(LogStatus status) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(
            await Client.GetAsync($"/api/library?hobby=games&status={status}", Ct));
}
