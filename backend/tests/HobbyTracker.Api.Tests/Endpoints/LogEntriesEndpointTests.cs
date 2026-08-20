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
    // ------------------------------------------------------------------ create

    [Fact]
    public async Task Creating_an_entry_returns_201_pointing_at_it()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, "starting over", new DateOnly(2026, 8, 1), null));

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
            mediaId, LogStatus.Completed, 9.0m, "first run", null, new DateOnly(2024, 3, 1)));
        var second = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.InProgress, null, "replay", new DateOnly(2026, 8, 1), null));

        // Replays are the point. Nothing here is a uniqueness conflict.
        first.StatusCode.ShouldBe(HttpStatusCode.Created);
        second.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task Rejects_an_entry_against_a_game_that_does_not_exist()
    {
        var response = await PostAsync(new CreateLogEntryRequest(
            999_999, LogStatus.Backlog, null, null, null, null));

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
            mediaId, LogStatus.Completed, rating, null, null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Rejects_a_rating_with_two_decimal_places()
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, 8.75m, null, null, null));

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
            mediaId, LogStatus.Completed, rating, null, null, null));

        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        (await ReadAsync<LogEntryDto>(response)).Rating.ShouldBe(rating);
    }

    [Fact]
    public async Task Rejects_a_completion_date_before_its_start_date()
    {
        var mediaId = await GivenGameAsync();

        var response = await PostAsync(new CreateLogEntryRequest(
            mediaId, LogStatus.Completed, null, null,
            new DateOnly(2026, 8, 20), new DateOnly(2026, 7, 1)));

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
        var entryId = await GivenLogEntryAsync(mediaId, LogStatus.InProgress, notes: "playing");

        var response = await Client.PutAsJsonAsync(
            $"/api/log-entries/{entryId}",
            new UpdateLogEntryRequest(
                LogStatus.Completed, 9.5m, "stuck the landing",
                new DateOnly(2026, 7, 2), new DateOnly(2026, 8, 19)),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var updated = await ReadAsync<LogEntryDto>(response);
        updated.Status.ShouldBe(LogStatus.Completed);
        updated.Rating.ShouldBe(9.5m);
        updated.Notes.ShouldBe("stuck the landing");
        updated.DateCompleted.ShouldBe(new DateOnly(2026, 8, 19));
    }

    [Fact]
    public async Task Replacing_an_entry_clears_fields_left_out_of_the_body()
    {
        var mediaId = await GivenGameAsync();
        var entryId = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, rating: 9.0m, notes: "loved it",
            dateStarted: new DateOnly(2026, 1, 1), dateCompleted: new DateOnly(2026, 2, 1));

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
        updated.Notes.ShouldBeNull();
        updated.DateStarted.ShouldBeNull();
        updated.DateCompleted.ShouldBeNull();
    }

    [Fact]
    public async Task Replacing_an_unknown_entry_is_a_404()
    {
        var response = await Client.PutAsJsonAsync(
            "/api/log-entries/999999",
            new UpdateLogEntryRequest(LogStatus.Backlog, null, null, null, null),
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
            new UpdateLogEntryRequest(LogStatus.Completed, 11m, null, null, null),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

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
}
