using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Notes on a pass — the thing the journal was supposed to be. This replaced a single text
/// column, where writing a second thought destroyed the first.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class NotesEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------------------ writing

    [Fact]
    public async Task A_note_is_written_against_a_pass_and_read_back_with_it()
    {
        var entryId = await GivenPassAsync();

        var response = await WriteAsync(entryId, "stuck on watcher knights");
        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var written = await ReadAsync<NoteDto>(response);
        written.Body.ShouldBe("stuck on watcher knights");
        written.LogEntryId.ShouldBe(entryId);
        written.WrittenAt.ShouldBe(Clock.UtcNow);

        // The Location header should actually resolve, not just look plausible.
        response.Headers.Location.ShouldNotBeNull();
        (await Client.GetAsync(response.Headers.Location, Ct)).StatusCode.ShouldBe(HttpStatusCode.OK);

        // And it comes back with its pass, which is the whole reason there is no list route.
        (await EntryAsync(entryId)).Notes.Single().Body.ShouldBe("stuck on watcher knights");
    }

    [Fact]
    public async Task Writing_a_second_note_does_not_replace_the_first()
    {
        // The bug this table exists to fix: one column meant a journal you could only overwrite.
        var entryId = await GivenPassAsync();

        await WriteAsync(entryId, "first");
        Clock.UtcNow = Clock.UtcNow.AddHours(2);
        await WriteAsync(entryId, "second");

        (await EntryAsync(entryId)).Notes.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Notes_come_back_newest_first()
    {
        // Matching every other list in this app: the journal endpoint, the year picker, and a
        // new card taking min(position) - 1.
        var entryId = await GivenPassAsync();

        await WriteAsync(entryId, "first");
        Clock.UtcNow = Clock.UtcNow.AddHours(2);
        await WriteAsync(entryId, "second");

        (await EntryAsync(entryId)).Notes.Select(note => note.Body)
            .ShouldBe(["second", "first"]);
    }

    [Fact]
    public async Task A_caller_cannot_choose_when_a_note_was_written()
    {
        var entryId = await GivenPassAsync();

        // writtenAt is absent from the request contract, so this is an unknown property rather
        // than a rejected one. The point is which value lands in the row.
        var response = await Client.PostAsJsonAsync(
            $"/api/log-entries/{entryId}/notes",
            new { body = "backdated", writtenAt = "2001-01-01T00:00:00Z" },
            Json,
            Ct);

        (await ReadAsync<NoteDto>(response)).WrittenAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task A_note_against_a_pass_that_does_not_exist_is_a_404()
    {
        // Unlike POST /api/log-entries with an unknown mediaId, where the missing thing is a
        // field in the body. Here it is the resource the route names.
        (await WriteAsync(999_999, "into the void")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_note_with_nothing_in_it_is_refused(string body)
    {
        var entryId = await GivenPassAsync();

        // [Required] alone lets "   " through, which would store a note that says nothing and
        // cannot be told apart from a mis-click.
        (await WriteAsync(entryId, body)).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ------------------------------------------------------------------ rewriting

    [Fact]
    public async Task Rewriting_a_note_changes_its_body_and_not_its_date()
    {
        var entryId = await GivenPassAsync();
        var noteId = (await ReadAsync<NoteDto>(await WriteAsync(entryId, "wathcer knights"))).Id;
        var writtenAt = Clock.UtcNow;

        Clock.UtcNow = Clock.UtcNow.AddDays(3);
        var response = await Client.PutAsJsonAsync(
            $"/api/notes/{noteId}", new NoteRequest("watcher knights"), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // The date on a note is when you wrote it, not when you last fixed a typo in it.
        var rewritten = await ReadAsync<NoteDto>(response);
        rewritten.Body.ShouldBe("watcher knights");
        rewritten.WrittenAt.ShouldBe(writtenAt);
    }

    [Fact]
    public async Task Rewriting_a_note_that_does_not_exist_is_a_404()
    {
        var response = await Client.PutAsJsonAsync(
            "/api/notes/999999", new NoteRequest("nobody home"), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // ------------------------------------------------------------------ deleting

    [Fact]
    public async Task Deleting_a_note_leaves_the_others_and_the_pass_alone()
    {
        var entryId = await GivenPassAsync();
        var first = (await ReadAsync<NoteDto>(await WriteAsync(entryId, "first"))).Id;
        await WriteAsync(entryId, "second");

        (await Client.DeleteAsync($"/api/notes/{first}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await EntryAsync(entryId)).Notes.Single().Body.ShouldBe("second");
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task Deleting_a_note_that_does_not_exist_is_a_404()
    {
        (await Client.DeleteAsync("/api/notes/999999", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private async Task<int> GivenPassAsync() =>
        await GivenLogEntryAsync(await GivenGameAsync(), LogStatus.InProgress);

    private Task<HttpResponseMessage> WriteAsync(int entryId, string body) =>
        Client.PostAsJsonAsync($"/api/log-entries/{entryId}/notes", new NoteRequest(body), Json, Ct);

    /// <summary>Through the API, so this also proves the read path loads notes at all.</summary>
    private async Task<LogEntryDto> EntryAsync(int entryId) =>
        await ReadAsync<LogEntryDto>(await Client.GetAsync($"/api/log-entries/{entryId}", Ct));
}
