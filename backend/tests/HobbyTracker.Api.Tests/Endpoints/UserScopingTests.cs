using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// One person seeing nothing of another's.
///
/// This is the suite that matters once anybody can sign up, because what it guards is not a bug
/// but a stranger reading your journal. It is at the endpoint level on purpose: a per-service
/// test cannot catch a controller that forgot to pass the user, and that is the mistake most
/// likely to be made.
///
/// The rule it encodes: log_entries and notes are yours; media and games are a shared catalogue
/// and must stay shared, or the upsert stops deduplicating and HowLongToBeat gets fetched once
/// per account. So the assertions here are always "the same game, none of your passes" rather
/// than "no such game".
///
/// 404 rather than 403 throughout: whether somebody else's pass exists is itself their business,
/// and a 403 answers that question for anyone who cares to ask.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class UserScopingTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_board_carries_none_of_the_other_persons_titles()
    {
        var (mediaId, _) = await GivenTheirsAsync();

        (await BoardAsync()).Items.ShouldBeEmpty();

        // And the game itself is still in the catalogue, which is the half that must not break.
        (await WithDbAsync(db => db.Games.AnyAsync(game => game.Id == mediaId, Ct))).ShouldBeTrue();
    }

    [Fact]
    public async Task A_card_counts_only_your_own_passes()
    {
        // EntryCount, LatestRating and CurrentStatus all come off the rows the board filters on,
        // so scoping the filter and not the projection leaves a card reporting a stranger's
        // replays and a stranger's rating underneath your own title.
        var other = await OtherAsync();
        var mediaId = await GivenGameAsync("Hollow Knight");

        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed, rating: 9.5m, userId: other);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed, rating: 8m, userId: other);

        var card = (await BoardAsync()).Items.ShouldHaveSingleItem();

        card.EntryCount.ShouldBe(1);
        card.LatestRating.ShouldBeNull();

        // The one that decides which column the card is in. If Latest can pick somebody else's
        // entry, a Backlog title appears under Completed and dragging it fights you.
        card.CurrentStatus.ShouldBe(LogStatus.Backlog);
    }

    [Fact]
    public async Task The_year_picker_offers_none_of_the_other_persons_years()
    {
        var mediaId = await GivenGameAsync();
        await GivenLogEntryAsync(
            mediaId,
            LogStatus.Completed,
            completedAt: Eastern(2024, 6, 1),
            userId: await OtherAsync());

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));

        years.ShouldBeEmpty();
    }

    [Fact]
    public async Task The_drawer_shows_a_shared_game_and_none_of_the_other_persons_passes()
    {
        // GameCatalogService.GetAsync is the one place that spans both worlds: the game belongs
        // to everybody, the entries belong to you.
        var (mediaId, _) = await GivenTheirsAsync();

        var detail = await ReadAsync<GameDetailDto>(await Client.GetAsync($"/api/games/{mediaId}", Ct));

        detail.Title.ShouldBe("Hollow Knight");
        detail.LogEntries.ShouldBeEmpty();
    }

    [Fact]
    public async Task Pinning_a_hltb_id_answers_with_your_own_passes_too()
    {
        // HltbService.DetailAsync is a verbatim twin of the query above, and the two have to
        // agree or the drawer lists one set of passes before a pin and another after it.
        var (mediaId, _) = await GivenTheirsAsync();
        Hltb.ById[26286] = FakeHltbClient.Game(26286, "Hollow Knight", 2017, 27m);

        var detail = await ReadAsync<GameDetailDto>(await Client.PutAsJsonAsync(
            $"/api/games/{mediaId}/hltb", new SetHltbIdRequest(26286), Json, Ct));

        detail.LogEntries.ShouldBeEmpty();
    }

    [Fact]
    public async Task Listing_passes_lists_only_yours()
    {
        var (mediaId, _) = await GivenTheirsAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var mine = await ReadAsync<PagedResult<LogEntryDto>>(
            await Client.GetAsync($"/api/log-entries?mediaId={mediaId}", Ct));

        mine.Total.ShouldBe(1);
        mine.Items.ShouldHaveSingleItem().Status.ShouldBe(LogStatus.InProgress);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Someone_elses_pass_is_not_there_to_read_or_to_change(string method)
    {
        var (mediaId, entryId) = await GivenTheirsAsync();

        var response = method switch
        {
            "GET" => await Client.GetAsync($"/api/log-entries/{entryId}", Ct),
            "PUT" => await Client.PutAsJsonAsync(
                $"/api/log-entries/{entryId}",
                new UpdateLogEntryRequest(LogStatus.Dropped, null, null, null, null, null),
                Json,
                Ct),
            _ => await Client.DeleteAsync($"/api/log-entries/{entryId}", Ct),
        };

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        // Still theirs, and still exactly as it was.
        var entry = await WithDbAsync(db => db.LogEntries.SingleAsync(e => e.Id == entryId, Ct));
        entry.Status.ShouldBe(LogStatus.Completed);
        entry.MediaId.ShouldBe(mediaId);
    }

    [Fact]
    public async Task A_note_cannot_be_written_onto_someone_elses_pass()
    {
        var (_, entryId) = await GivenTheirsAsync();

        var response = await Client.PostAsJsonAsync(
            $"/api/log-entries/{entryId}/notes", new NoteRequest("Mine now"), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task Someone_elses_note_is_not_there_either(string method)
    {
        // Notes carry no user column at all — they are reachable only through their entry, so
        // this is the one that has to be a join rather than a filter. It is also the one most
        // likely to be missed, because there is no absent column to notice.
        var (_, entryId) = await GivenTheirsAsync();
        var noteId = await GivenNoteAsync(entryId);

        var response = method switch
        {
            "GET" => await Client.GetAsync($"/api/notes/{noteId}", Ct),
            "PUT" => await Client.PutAsJsonAsync(
                $"/api/notes/{noteId}", new NoteRequest("Rewritten"), Json, Ct),
            _ => await Client.DeleteAsync($"/api/notes/{noteId}", Ct),
        };

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await WithDbAsync(db => db.Notes.SingleAsync(n => n.Id == noteId, Ct))).Body.ShouldBe("Theirs");
    }

    [Fact]
    public async Task Someone_elses_card_cannot_be_dragged()
    {
        var (mediaId, entryId) = await GivenTheirsAsync();

        var response = await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(LogStatus.InProgress), Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);

        (await WithDbAsync(db => db.LogEntries.SingleAsync(e => e.Id == entryId, Ct)))
            .Status.ShouldBe(LogStatus.Completed);

        // And nothing was inserted either. Leaving Completed starts a new entry by rule, so an
        // unscoped transition would not just move their card, it would grow their history.
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task Someone_elses_card_cannot_be_closed()
    {
        var (mediaId, entryId) = await GivenTheirsAsync();

        var response = await Client.DeleteAsync($"/api/library/{mediaId}/current", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NotFound);
        (await WithDbAsync(db => db.LogEntries.AnyAsync(e => e.Id == entryId, Ct))).ShouldBeTrue();
    }

    [Fact]
    public async Task Reordering_leaves_the_other_persons_column_alone()
    {
        var other = await OtherAsync();
        var first = await GivenGameAsync("First", externalId: "1");
        var second = await GivenGameAsync("Second", externalId: "2");

        await GivenLogEntryAsync(first);
        await GivenLogEntryAsync(second);
        var theirs = await GivenLogEntryAsync(first, userId: other);
        await SetPositionAsync(theirs, 7);

        var response = await Client.PutAsJsonAsync(
            "/api/library/order",
            new ReorderRequest("games", LogStatus.Backlog, [second, first]),
            Json,
            Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await PositionAsync(theirs)).ShouldBe(7);
    }

    [Fact]
    public async Task A_new_card_lands_on_top_of_your_own_column_and_not_of_theirs()
    {
        // BoardPositions.TopOfColumnAsync is static and takes the context as a parameter, so it
        // is invisible to constructor injection and is the site most likely to be missed. Left
        // unscoped, one person's backlog silently decides where another's new cards land.
        var other = await OtherAsync();
        var theirs = await GivenGameAsync("Theirs", externalId: "1");
        await SetPositionAsync(await GivenLogEntryAsync(theirs, userId: other), -500);

        var mine = await GivenGameAsync("Mine", externalId: "2");
        var created = await ReadAsync<LogEntryDto>(await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mine, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct));

        // The top of an empty column of my own is -1, not one better than their -500.
        (await PositionAsync(created.Id)).ShouldBe(-1);
    }

    [Fact]
    public async Task Nobody_signed_in_is_a_401_rather_than_a_board()
    {
        var response = await AnonymousClient.GetAsync("/api/library?hobby=games", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Nobody_signed_in_cannot_search_the_catalogue_either()
    {
        // The catalogue is shared, but it is not public: an anonymous search is free IGDB
        // traffic and an unbounded write into media.
        var response = await AnonymousClient.GetAsync("/api/games?search=halo", Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        Igdb.Calls.ShouldBeEmpty();
    }

    // ----------------------------------------------------------------- helpers

    private int? _other;

    /// <summary>The other person, made once per test and only when one is asked for.</summary>
    private async Task<int> OtherAsync() => _other ??= await GivenUserAsync("Someone Else");

    /// <summary>A game on their board and on nobody else's, plus the pass that put it there.</summary>
    private async Task<(int MediaId, int EntryId)> GivenTheirsAsync()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");
        var entryId = await GivenLogEntryAsync(
            mediaId,
            LogStatus.Completed,
            rating: 9.5m,
            completedAt: Eastern(2024, 6, 1),
            userId: await OtherAsync());

        return (mediaId, entryId);
    }

    private Task<int> GivenNoteAsync(int entryId) => WithDbAsync(async db =>
    {
        var note = new Note { LogEntryId = entryId, Body = "Theirs", WrittenAt = Clock.UtcNow };

        db.Notes.Add(note);
        await db.SaveChangesAsync(Ct);
        return note.Id;
    });

    private async Task<PagedResult<LibraryItemDto>> BoardAsync() =>
        await ReadAsync<PagedResult<LibraryItemDto>>(
            await Client.GetAsync("/api/library?hobby=games", Ct));

    private Task<int> PositionAsync(int entryId) => WithDbAsync(db => db.LogEntries
        .Where(entry => entry.Id == entryId)
        .Select(entry => entry.Position)
        .SingleAsync(Ct));

    private Task SetPositionAsync(int entryId, int position) => WithDbAsync(async db =>
    {
        var entry = await db.LogEntries.SingleAsync(candidate => candidate.Id == entryId, Ct);
        entry.Position = position;

        await db.SaveChangesAsync(Ct);
    });
}
