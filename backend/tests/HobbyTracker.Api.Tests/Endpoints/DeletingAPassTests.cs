using System.Data.Common;
using System.Globalization;
using System.Text.RegularExpressions;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.Extensions.DependencyInjection;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Deleting one pass from the drawer, <c>DELETE /api/log-entries/{id}</c>, and what happens to
/// what was written during it.
///
/// A pass that has another beside it hands its notes to the current one before it goes, with
/// their dates unchanged. Until 9 October 2026 they went with it by cascade and the confirm never
/// said so, which is how nine notes were lost the morning #14 was found. They came back from the
/// nightly backup. The only pass still takes its notes, because the title leaves the board with it.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed partial class DeletingAPassTests(PostgresFixture postgres)
    : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Deleting_an_earlier_pass_moves_its_notes_to_the_current_one()
    {
        // #14's morning: the real pass, finished by mistake and carrying everything written,
        // under the blank one a mistaken replay started.
        var mediaId = await GivenGameAsync("Hollow Knight: Silksong");
        var real = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed,
            startedAt: Eastern(2026, 9, 17, 19), completedAt: Eastern(2026, 10, 8, 3, 14));
        var blank = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 10, 8, 9, 8));
        var first = await GivenNoteAsync(
            real, "Moss Mother took twelve tries.", Eastern(2026, 9, 19, 22, 15));
        var last = await GivenNoteAsync(real, "Act 2 at last.", Eastern(2026, 10, 5, 21, 40));

        (await DeleteAsync(real)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var notes = await NotesAsync();
        notes.Select(note => note.Id).ShouldBe([first, last]);
        notes.ShouldAllBe(note => note.LogEntryId == blank);

        // When they were written, not when they moved.
        notes[0].WrittenAt.ShouldBe(Eastern(2026, 9, 19, 22, 15));
        notes[1].WrittenAt.ShouldBe(Eastern(2026, 10, 5, 21, 40));
        notes[1].Body.ShouldBe("Act 2 at last.");
    }

    [Fact]
    public async Task The_drawer_shows_the_moved_notes_on_the_pass_that_stays()
    {
        // Read back the way the drawer reads them: one pass left, holding its own note and the
        // two it was handed, newest first like any pass's.
        var mediaId = await GivenGameAsync("Hollow Knight");
        var finished = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, completedAt: Eastern(2026, 7, 4));
        var replay = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 28));
        await GivenNoteAsync(finished, "Mantis Lords first try.", Eastern(2026, 6, 20));
        await GivenNoteAsync(finished, "The Radiance. Done.", Eastern(2026, 7, 4));
        await GivenNoteAsync(replay, "Steel Soul this time.", Eastern(2026, 9, 28, 19, 30));

        await DeleteAsync(finished);

        var pass = (await DetailAsync(mediaId)).LogEntries.ShouldHaveSingleItem();
        pass.Id.ShouldBe(replay);
        pass.Notes.Select(note => note.Body).ShouldBe(
            ["Steel Soul this time.", "The Radiance. Done.", "Mantis Lords first try."]);
    }

    [Fact]
    public async Task Deleting_the_current_pass_hands_its_notes_to_the_one_that_becomes_current()
    {
        // A replay with notes on it, deleted itself. The finished pass under it is what the board
        // shows next, so that is where the notes go, though it is finished.
        var mediaId = await GivenGameAsync("Hollow Knight");
        var finished = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, completedAt: Eastern(2026, 7, 4));
        var replay = await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, startedAt: Eastern(2026, 9, 28));
        await GivenNoteAsync(replay, "Steel Soul this time.");
        await GivenNoteAsync(replay, "Died to a Primal Aspid. Run over.");

        (await DeleteAsync(replay)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var notes = await NotesAsync();
        notes.Count.ShouldBe(2);
        notes.ShouldAllBe(note => note.LogEntryId == finished);
    }

    [Fact]
    public async Task The_notes_go_to_the_pass_the_board_calls_current_and_not_the_one_beside_it()
    {
        // Logged in the opposite order to their ids, so the wrong pass is chosen by an order on
        // the id alone, and by a rule that picks the pass next to the deleted one. The board
        // calls a pass current by logged_at DESC, id DESC, and the notes go where it points.
        var mediaId = await GivenGameAsync("Celeste");
        Clock.UtcNow = Eastern(2026, 10, 1);
        var current = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        Clock.UtcNow = Eastern(2024, 3, 2);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        Clock.UtcNow = Eastern(2022, 6, 9);
        var oldest = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenNoteAsync(oldest, "Chapter 7 broke me.");

        await DeleteAsync(oldest);

        (await NotesAsync()).ShouldHaveSingleItem().LogEntryId.ShouldBe(current);

        // And the drawer agrees about which pass that is: the first it shows.
        (await DetailAsync(mediaId)).LogEntries[0].Id.ShouldBe(current);
    }

    [Fact]
    public async Task Deleting_the_only_pass_still_takes_its_notes()
    {
        // There is no pass left to hand them to, and the title leaves the board with it. The
        // drawer says so first, and counts them.
        var mediaId = await GivenGameAsync("The Witcher 3: Wild Hunt");
        var only = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenNoteAsync(only, "Blood and Wine is better than most whole games.");

        (await DeleteAsync(only)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await NotesAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Notes_move_only_between_your_own_passes_of_one_title()
    {
        // Both strangers are logged after everything of yours, so a pass chosen without either
        // half of the scope is one of them: somebody else's pass of the same game, which would
        // put your notes in their journal, or your own pass of another game.
        var mediaId = await GivenGameAsync("Celeste", externalId: "1");
        var otherGame = await GivenGameAsync("Hades", externalId: "2");
        var earlier = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        var current = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await GivenNoteAsync(earlier, "Golden strawberry, finally.");

        Clock.UtcNow = Clock.UtcNow.AddDays(1);
        await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, userId: await GivenUserAsync("Somebody Else"));
        await GivenLogEntryAsync(otherGame, LogStatus.InProgress);

        await DeleteAsync(earlier);

        (await NotesAsync()).ShouldHaveSingleItem().LogEntryId.ShouldBe(current);
    }

    [Fact]
    public async Task Your_only_pass_takes_its_notes_even_when_somebody_else_has_the_same_game()
    {
        // Where a missing scope would leak a note rather than lose one: with their pass ruled in,
        // it would look like the pass that stays, and your notes would be written into their
        // journal.
        var mediaId = await GivenGameAsync("Celeste");
        var mine = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenNoteAsync(mine, "Mine, and nobody else's.");
        await GivenLogEntryAsync(
            mediaId, LogStatus.InProgress, userId: await GivenUserAsync("Somebody Else"));

        await DeleteAsync(mine);

        (await NotesAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task A_delete_that_fails_leaves_the_notes_where_they_were()
    {
        // The move and the delete are one write. As two, a delete refused after the move had
        // landed would leave this pass on the board with its notes gone from it, and nothing
        // deleted to account for it.
        var mediaId = await GivenGameAsync("Celeste");
        var earlier = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await GivenNoteAsync(earlier, "Golden strawberry, finally.");

        using var host = Factory.WithWebHostBuilder(builder => builder.ConfigureTestServices(
            services => services.ConfigureDbContext<HobbyTrackerDbContext>(
                options => options.AddInterceptors(new RefusesToDeleteAPass()))));
        using var client = host.CreateClient();
        client.DefaultRequestHeaders.Add(
            TestAuthHandler.UserHeader, UserId.ToString(CultureInfo.InvariantCulture));

        (await client.DeleteAsync($"/api/log-entries/{earlier}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.InternalServerError);

        (await NotesAsync()).ShouldHaveSingleItem().LogEntryId.ShouldBe(earlier);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(2);
    }

    private Task<HttpResponseMessage> DeleteAsync(int entryId) =>
        Client.DeleteAsync($"/api/log-entries/{entryId}", Ct);

    /// <summary>Every note there is, in the order made, read from the rows, not an answer.</summary>
    private Task<List<Note>> NotesAsync() =>
        WithDbAsync(db => db.Notes.OrderBy(note => note.Id).ToListAsync(Ct));

    private async Task<GameDetailDto> DetailAsync(int mediaId) =>
        await ReadAsync<GameDetailDto>(await Client.GetAsync($"/api/games/{mediaId}", Ct));

    /// <summary>
    /// Refuses any command that deletes a pass, as a database that went away mid-write would. It
    /// sees the command before it runs, so whatever was sent alongside it in the same command
    /// never runs either, and whatever was sent before it in the same transaction is undone.
    /// </summary>
    private sealed partial class RefusesToDeleteAPass : DbCommandInterceptor
    {
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Refuse(command);
            return ValueTask.FromResult(result);
        }

        public override ValueTask<InterceptionResult<int>> NonQueryExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<int> result,
            CancellationToken cancellationToken = default)
        {
            Refuse(command);
            return ValueTask.FromResult(result);
        }

        private static void Refuse(DbCommand command)
        {
            if (DeletesAPass().IsMatch(command.CommandText))
            {
                throw new InvalidOperationException("The database went away mid-write.");
            }
        }

        [GeneratedRegex(@"DELETE FROM ""?log_entries""?", RegexOptions.IgnoreCase)]
        private static partial Regex DeletesAPass();
    }
}
