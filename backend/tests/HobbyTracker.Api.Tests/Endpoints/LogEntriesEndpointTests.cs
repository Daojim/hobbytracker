using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The journal itself — the thing the whole app exists to do.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LogEntriesEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------- when it was written down

    [Fact]
    public async Task An_entry_records_the_moment_it_was_written()
    {
        var mediaId = await GivenGameAsync();

        var created = await ReadAsync<LogEntryDto>(await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Backlog, null, null, null, null, null)));

        // Every entry has this, including a backlog one carrying neither other timestamp.
        created.LoggedAt.ShouldBe(Clock.UtcNow);
        (await EntryAsync(created.Id)).LoggedAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task A_caller_cannot_choose_when_an_entry_was_written()
    {
        var mediaId = await GivenGameAsync();

        // loggedAt is absent from the request contract, so this is an unknown property rather
        // than a rejected one. The point is which value lands in the row.
        var response = await Client.PostAsJsonAsync("/api/log-entries", new
        {
            mediaId,
            status = "Backlog",
            loggedAt = "2001-01-01T00:00:00Z",
        }, Json, Ct);

        (await ReadAsync<LogEntryDto>(response)).LoggedAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task Replacing_an_entry_does_not_move_when_it_was_written()
    {
        var mediaId = await GivenGameAsync();
        var created = await ReadAsync<LogEntryDto>(await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Backlog, null, null, null, null, null)));

        // PUT clears everything the body leaves out — but loggedAt is not the caller's to
        // clear, any more than the id is.
        Clock.UtcNow = Clock.UtcNow.AddDays(3);
        await Client.PutAsJsonAsync(
            $"/api/log-entries/{created.Id}",
            new UpdateLogEntryRequest(LogStatus.InProgress, null, null, null, null, null),
            Json,
            Ct);

        (await EntryAsync(created.Id)).LoggedAt.ShouldBe(created.LoggedAt);
    }

    // ---------------------------------------------------- times without an offset

    [Fact]
    public async Task A_bare_date_means_midnight_here_not_midnight_in_utc()
    {
        var mediaId = await GivenGameAsync();

        // What a curl by hand looks like, and what any client thinking in dates will send.
        // Read as UTC this is 7pm on the 2nd here — the same off-by-one this whole change
        // exists to remove, reintroduced through the API instead of through the clock.
        var response = await Client.PostAsJsonAsync("/api/log-entries", new
        {
            mediaId,
            status = "InProgress",
            startedAt = "2026-03-03",
        }, Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<LogEntryDto>(response)).StartedAt.ShouldBe(Eastern(2026, 3, 3, 0, 0));
    }

    [Fact]
    public async Task A_time_with_no_offset_is_read_here_too()
    {
        var mediaId = await GivenGameAsync();

        var response = await Client.PostAsJsonAsync("/api/log-entries", new
        {
            mediaId,
            status = "InProgress",
            startedAt = "2026-08-20T21:30:00",
        }, Json, Ct);

        (await ReadAsync<LogEntryDto>(response)).StartedAt.ShouldBe(Eastern(2026, 8, 20, 21, 30));
    }

    [Fact]
    public async Task An_explicit_offset_is_believed()
    {
        var mediaId = await GivenGameAsync();

        // Someone who says what they mean gets what they said, wherever they are.
        var response = await Client.PostAsJsonAsync("/api/log-entries", new
        {
            mediaId,
            status = "InProgress",
            startedAt = "2026-08-20T21:30:00+09:00",
        }, Json, Ct);

        (await ReadAsync<LogEntryDto>(response)).StartedAt
            .ShouldBe(new DateTimeOffset(2026, 8, 20, 12, 30, 0, TimeSpan.Zero));
    }

    // ------------------------------------------------------------------ create

    [Fact]
    public async Task Creating_an_entry_returns_201_pointing_at_it()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, null, Eastern(2026, 8, 1), null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var created = await ReadAsync<LogEntryDto>(response);
        created.Id.ShouldBeGreaterThan(0);
        created.MediaId.ShouldBe(mediaId);
        created.MediaTitle.ShouldBe("Hollow Knight");
        created.Status.ShouldBe(LogStatus.InProgress);

        // The Location header should actually resolve, not just look plausible.
        response.Headers.Location.ShouldNotBeNull();
        var followed = await Client.GetAsync(response.Headers.Location, Ct);
        followed.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<LogEntryDto>(followed)).Id.ShouldBe(created.Id);
    }

    [Fact]
    public async Task One_game_can_be_logged_many_times()
    {
        var mediaId = await GivenGameAsync();

        var first = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, 9.0m, null, null, Eastern(2024, 3, 1), null));
        var second = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, null, Eastern(2026, 8, 1), null, null));

        // Replays are the point. Nothing here is a uniqueness conflict.
        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        second.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task Rejects_an_entry_against_a_game_that_does_not_exist()
    {
        var response = await PostAsync(new CreateLogEntryRequest(
            999_999, LogStatus.Backlog, null, null, null, null, null));

        // A bare foreign-key violation would surface as a 500. This is the caller's mistake.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(0.5)]
    [InlineData(10.5)]
    [InlineData(-2)]
    public async Task Rejects_a_rating_outside_the_scale(decimal rating)
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, rating, null, null, null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rejects_a_rating_with_two_decimal_places()
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, 8.75m, null, null, null, null));

        // numeric(3,1) would round this to 8.8 and report success, leaving the response
        // disagreeing with the stored value. Refusing is the honest answer.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(0);
    }

    [Theory]
    [InlineData(1.0)]
    [InlineData(8.5)]
    [InlineData(9.6)]
    [InlineData(10.0)]
    public async Task Accepts_a_rating_on_the_scale(decimal rating)
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, rating, null, null, null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<LogEntryDto>(response)).Rating.ShouldBe(rating);
    }

    // ------------------------------------------------------------ hours played

    [Theory]
    [InlineData(0.5)]
    [InlineData(12)]
    [InlineData(31.25)]
    [InlineData(999.99)]
    public async Task Accepts_the_hours_a_pass_took(decimal hours)
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null, null, null, hours));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<LogEntryDto>(response)).HoursPlayed.ShouldBe(hours);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task Rejects_hours_that_are_not_a_length_of_time(decimal hours)
    {
        // Nought hours played is not a fact worth recording; leaving it out is how you say
        // nothing, and how you take a number back.
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null, null, null, hours));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rejects_more_hours_than_the_column_can_hold()
    {
        // numeric(5,2) stops at 999.99, and overflowing it throws rather than rounding — a 500
        // where the caller's mistake deserves a 400.
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null, null, null, 1000m));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rejects_hours_with_three_decimal_places()
    {
        // The rating's hazard, one place further out: numeric(5,2) rounds 12.345 to 12.35 and
        // reports success, leaving the response disagreeing with the stored value.
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null, null, null, 12.345m));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task An_update_that_leaves_hours_out_clears_them()
    {
        // PUT, not PATCH: absent means cleared. That is the whole reason for choosing it, and
        // it has to hold for the newest field as much as the oldest.
        var mediaId = await GivenGameAsync();
        var created = await ReadAsync<LogEntryDto>(await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null, null, null, 31.5m)));

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{created.Id}",
            new UpdateLogEntryRequest(LogStatus.Completed, null, null, null, null, null),
            Json,
            Ct);

        (await EntryAsync(created.Id)).HoursPlayed.ShouldBeNull();
    }

    [Fact]
    public async Task Rejects_a_completion_date_before_its_start_date()
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null,
            Eastern(2026, 8, 20), Eastern(2026, 7, 1), null));

        // The database would refuse this too, but as a 500. Catch it as a 400 first.
        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Status_travels_as_a_string_in_both_directions()
    {
        var mediaId = await GivenGameAsync();

        var response = await Client.PostAsync(
            "/api/log-entries",
            new StringContent(
                $$"""{"mediaId": {{mediaId}}, "status": "Completed", "rating": 9.5}""",
                Encoding.UTF8,
                "application/json"),
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var body = await response.Content.ReadAsStringAsync(Ct);
        body.ShouldContain("\"status\":\"Completed\"");

        // Without a string enum converter this would be 2 on the wire, which is unreadable
        // and silently wrong the moment LogStatus is reordered.
        body.ShouldNotContain("\"status\":2");
    }

    // -------------------------------------------------------------------- read

    [Fact]
    public async Task Lists_entries_most_recent_first()
    {
        var mediaId = await GivenGameAsync();
        var first = await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        var second = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var page = await GetPageAsync("/api/log-entries");

        page.Total.ShouldBe(2);
        page.Items.Select(e => e.Id).ShouldBe([second, first]);
    }

    [Fact]
    public async Task Filters_by_status()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        var backlog = await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var page = await GetPageAsync("/api/log-entries?status=Backlog");

        page.Items.ShouldHaveSingleItem().Id.ShouldBe(backlog);
    }

    [Fact]
    public async Task Filters_by_media()
    {
        var one = await GivenGameAsync("One", externalId: "1");
        var two = await GivenGameAsync("Two", externalId: "2");
        await GivenLogEntryAsync(one);
        var wanted = await GivenLogEntryAsync(two);

        var page = await GetPageAsync($"/api/log-entries?mediaId={two}");

        page.Items.ShouldHaveSingleItem().Id.ShouldBe(wanted);
    }

    [Fact]
    public async Task Pages_through_results()
    {
        var mediaId = await GivenGameAsync();
        foreach (var _ in Enumerable.Range(0, 5))
        {
            await GivenLogEntryAsync(mediaId);
        }

        var page = await GetPageAsync("/api/log-entries?page=2&pageSize=2");

        page.Total.ShouldBe(5);
        page.Page.ShouldBe(2);
        page.PageSize.ShouldBe(2);
        page.Items.Count.ShouldBe(2);
    }

    [Fact]
    public async Task Reading_an_unknown_entry_is_a_404()
    {
        (await Client.GetAsync("/api/log-entries/999999", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // ------------------------------------------------------------------ update

    [Fact]
    public async Task Replacing_an_entry_updates_every_field()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var response = await Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(
                LogStatus.Completed, 9.5m, null,
                Eastern(2026, 7, 2), Eastern(2026, 8, 19), null),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updated = await ReadAsync<LogEntryDto>(response);
        updated.Status.ShouldBe(LogStatus.Completed);
        updated.Rating.ShouldBe(9.5m);
        updated.CompletedAt.ShouldBe(Eastern(2026, 8, 19));
    }

    [Fact]
    public async Task Replacing_an_entry_clears_fields_left_out_of_the_body()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, rating: 9.0m,
            startedAt: Eastern(2026, 1, 1), completedAt: Eastern(2026, 2, 1));

        var response = await Client.PutAsync(
            $"/api/log-entries/{entryId}",
            new StringContent("""{"status": "Backlog"}""", Encoding.UTF8, "application/json"),
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        // This is what PUT buys over PATCH: an absent field means cleared, with no ambiguity
        // about whether the caller meant "unset it" or "leave it".
        var updated = await ReadAsync<LogEntryDto>(response);
        updated.Status.ShouldBe(LogStatus.Backlog);
        updated.Rating.ShouldBeNull();
        updated.StartedAt.ShouldBeNull();
        updated.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Replacing_an_unknown_entry_is_a_404()
    {
        var response = await Client.PutAsJsonAsync(
            "/api/log-entries/999999",
            new UpdateLogEntryRequest(LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Replacing_an_entry_still_validates_the_rating()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId);

        var response = await Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(LogStatus.Completed, 11m, null, null, null, null),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ------------------------------------------- the platform it was played on

    [Fact]
    public async Task A_pass_records_the_platform_it_was_played_on()
    {
        var mediaId = await GivenGameAsync();

        var created = await ReadAsync<LogEntryDto>(await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, "Switch", null, null, null)));

        created.Platform.ShouldBe("Switch");
        (await EntryAsync(created.Id)).Platform.ShouldBe("Switch");
    }

    [Fact]
    public async Task Replacing_an_entry_can_clear_the_platform()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress, platform: "PC");

        // Absent means cleared, the same contract every other field on this body has.
        await Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(LogStatus.InProgress, null, null, null, null, null),
            Json,
            Ct);

        (await EntryAsync(entryId)).Platform.ShouldBeNull();
    }

    [Fact]
    public async Task A_platform_longer_than_the_column_is_refused()
    {
        var mediaId = await GivenGameAsync();

        // A 400, not the 500 a bare column-length violation would surface as.
        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, new string('x', 101), null, null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ------------------------------------------------- notes travel with the entry

    [Fact]
    public async Task Listing_entries_carries_their_notes()
    {
        // Every read path that maps a LogEntryDto has to load the notes, and one that forgets
        // reports an entry with none — silently, with nothing failing to compile. There is one
        // of these per path for that reason.
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await WriteNoteAsync(entryId, "hard but fair");

        var page = await GetPageAsync($"/api/log-entries?mediaId={mediaId}");

        page.Items.Single().Notes.Single().Body.ShouldBe("hard but fair");
    }

    [Fact]
    public async Task Replacing_an_entry_answers_with_its_notes_still_attached()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress);
        await WriteNoteAsync(entryId, "hard but fair");

        // Notes are no longer a field on this body, so a PUT cannot clear them — and the
        // response has to say so rather than looking like it just wiped them.
        var response = await Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(LogStatus.Completed, 9.5m, null, null, null, null),
            Json,
            Ct);

        (await ReadAsync<LogEntryDto>(response)).Notes.Single().Body.ShouldBe("hard but fair");
    }

    private Task<HttpResponseMessage> WriteNoteAsync(int entryId, string body) =>
        Client.PostAsJsonAsync($"/api/log-entries/{entryId}/notes", new NoteRequest(body), Json, Ct);

    // ------------------------------------------------------------------ delete

    [Fact]
    public async Task Deleting_an_entry_removes_it_and_leaves_the_game_alone()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(mediaId);

        var deleted = await Client.DeleteAsync($"/api/log-entries/{entryId}", Ct);
        deleted.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await Client.GetAsync($"/api/log-entries/{entryId}", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Un-logging something must not evict it from the catalog.
        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task Deleting_an_unknown_entry_is_a_404()
    {
        (await Client.DeleteAsync("/api/log-entries/999999", Ct))
            .StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private Task<HttpResponseMessage> PostAsync(CreateLogEntryRequest request) =>
        Client.PostAsJsonAsync("/api/log-entries", request, Json, Ct);

    private async Task<PagedResult<LogEntryDto>> GetPageAsync(string url) =>
        await ReadAsync<PagedResult<LogEntryDto>>(await Client.GetAsync(url, Ct));

    /// <summary>Reads the row itself, rather than trusting the response to describe it.</summary>
    private Task<LogEntry> EntryAsync(int id) =>
        WithDbAsync(db => db.LogEntries.SingleAsync(entry => entry.Id == id, Ct));
}
