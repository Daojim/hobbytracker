using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Putting a title on the board straight into a column — what a tile's +, ▶ and ✓ call.
///
/// An add is a move from nowhere. The first pass is built by the code a drag out of Completed
/// uses to build a replay, so it lands on top of its column and carries the dates a drag into
/// that column would have given it: adding straight to Playing and adding to Backlog then
/// dragging leave the same record. The equivalence below is the test that says so for every
/// column; the rest pin the edges.
///
/// <c>POST /api/log-entries</c> is untouched and is not this. It writes a pass with exactly the
/// fields it is sent — no dates unless you give it some — which is right for the journal and
/// for the e2e suite's seeding, and wrong for a button: a Playing entry with no start belongs to
/// no year, and the board reads one year at a time.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AddingToBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    /// <summary>
    /// The stopped clock's instant, written out rather than read back — see
    /// <see cref="StatusTransitionTests"/> for why a literal beats recomputing it.
    /// </summary>
    private static readonly DateTimeOffset Now = new(2026, 9, 15, 16, 0, 0, TimeSpan.Zero);

    // ---------------------------------------------------------------- the dates

    [Fact]
    public async Task Adding_to_the_backlog_writes_a_pass_with_no_dates()
    {
        var mediaId = await GivenGameAsync("Celeste");

        (await AddAsync(mediaId, LogStatus.Backlog)).StatusCode.ShouldBe(HttpStatusCode.Created);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Backlog);
        entry.StartedAt.ShouldBeNull();
        entry.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Adding_straight_to_playing_stamps_today_as_the_start()
    {
        // The whole reason this is not POST /api/log-entries with a different status: Playing is
        // narrowed by started_at, so a pass arriving without one would be on no year's board.
        var mediaId = await GivenGameAsync("Celeste");

        await AddAsync(mediaId, LogStatus.InProgress);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.InProgress);
        entry.StartedAt.ShouldBe(Now);
        entry.CompletedAt.ShouldBeNull();
    }

    [Fact]
    public async Task Adding_straight_to_completed_stamps_the_finish_and_invents_no_start()
    {
        // Somebody filling a board backwards from Most played is adding games finished years
        // ago, and today is the only finish anybody has said. A start would be made up — the
        // drag out of Backlog leaves it empty for the same reason.
        var mediaId = await GivenGameAsync("Celeste");

        await AddAsync(mediaId, LogStatus.Completed);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Completed);
        entry.StartedAt.ShouldBeNull();
        entry.CompletedAt.ShouldBe(Now);
    }

    [Theory]
    [InlineData(LogStatus.Backlog)]
    [InlineData(LogStatus.InProgress)]
    [InlineData(LogStatus.OnHold)]
    [InlineData(LogStatus.Completed)]
    [InlineData(LogStatus.Dropped)]
    public async Task An_add_leaves_exactly_what_adding_to_the_backlog_and_moving_would(
        LogStatus column)
    {
        // The guarantee the button makes, stated as an equivalence rather than restated date by
        // date: whatever the drag rules say about a column, an add into it says the same, and
        // the day a rule changes the two cannot drift apart. All five, although a tile offers
        // three — which ones are offered is the client's business, and the API has one rule.
        var added = await GivenGameAsync("Added", externalId: "1");
        var moved = await GivenGameAsync("Moved", externalId: "2");

        (await AddAsync(added, column)).StatusCode.ShouldBe(HttpStatusCode.Created);

        await GivenLogEntryAsync(moved, LogStatus.Backlog);
        await MoveAsync(moved, column);

        var viaAdd = (await EntriesAsync(added)).ShouldHaveSingleItem();
        var viaMove = (await EntriesAsync(moved)).ShouldHaveSingleItem();

        viaAdd.Status.ShouldBe(viaMove.Status);
        viaAdd.StartedAt.ShouldBe(viaMove.StartedAt);
        viaAdd.CompletedAt.ShouldBe(viaMove.CompletedAt);
        viaAdd.SeasonNumber.ShouldBe(viaMove.SeasonNumber);
        viaAdd.EpisodeNumber.ShouldBe(viaMove.EpisodeNumber);
    }

    // ---------------------------------------------------------------- the card

    [Fact]
    public async Task An_add_lands_on_top_of_its_column()
    {
        // Placed by hand, and below zero, because the board's own placement is what is under
        // test: two passes left at the default position of 0 would put a newcomer on top by the
        // id tie-break alone, and the test would pass whatever the add did with the position.
        await GivenPlacedAsync("Already playing", "1", LogStatus.InProgress, position: -5);
        await GivenPlacedAsync("Also playing", "2", LogStatus.InProgress, position: -4);
        var added = await GivenGameAsync("Just added", externalId: "3");

        await AddAsync(added, LogStatus.InProgress);

        (await ColumnAsync(LogStatus.InProgress)).Items[0].MediaId.ShouldBe(added);
    }

    [Fact]
    public async Task Adding_answers_with_the_card_as_the_board_will_draw_it()
    {
        // Created, and the created thing is the title's place on your board: the address it was
        // posted to, which is the one DELETE takes away again. So no Location header — RFC 9110
        // reads its absence as "the target URI", which is exactly right.
        var mediaId = await GivenGameAsync("Celeste");

        var response = await AddAsync(mediaId, LogStatus.InProgress);

        response.StatusCode.ShouldBe(HttpStatusCode.Created);

        var card = await ReadAsync<LibraryItemDto>(response);
        card.MediaId.ShouldBe(mediaId);
        card.Title.ShouldBe("Celeste");
        card.CurrentStatus.ShouldBe(LogStatus.InProgress);
        card.EntryCount.ShouldBe(1);
        card.LastActivity.ShouldBe(Now);
    }

    // ---------------------------------------------------------------- refusals

    [Fact]
    public async Task Adding_a_title_already_on_your_board_is_refused_and_writes_nothing()
    {
        // Only a stale tile can ask — a second tab, or a list loaded before the title went on the
        // board. Writing a second pass would be a replay nobody made, and one sitting on top of a
        // 2024 completion reads on the board as that game being started again.
        var mediaId = await GivenGameAsync("Celeste");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, rating: 9.6m,
            startedAt: Eastern(2024, 1, 10), completedAt: Eastern(2024, 3, 2));

        var response = await AddAsync(mediaId, LogStatus.Backlog);

        response.StatusCode.ShouldBe(HttpStatusCode.Conflict);

        var entry = (await EntriesAsync(mediaId)).ShouldHaveSingleItem();
        entry.Status.ShouldBe(LogStatus.Completed);
        entry.CompletedAt.ShouldBe(Eastern(2024, 3, 2));
        entry.Rating.ShouldBe(9.6m);

        // And nobody is told a title arrived, because none did.
        HltbQueue.Enqueued.ShouldBeEmpty();
    }

    [Fact]
    public async Task Somebody_elses_pass_does_not_stop_you_adding_it()
    {
        // The title is shared and the passes are not. "Already on your board" has to mean yours:
        // asked of the media row alone, the first person to add a game would lock everyone else
        // out of it, with a 409 telling them it was already on a board they have never seen.
        var mediaId = await GivenGameAsync("Celeste");
        var theirs = await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, userId: await GivenUserAsync("Somebody Else"));

        (await AddAsync(mediaId, LogStatus.InProgress)).StatusCode.ShouldBe(HttpStatusCode.Created);

        var entries = await EntriesAsync(mediaId);
        entries.Count.ShouldBe(2);
        entries.Single(entry => entry.Id == theirs).Status.ShouldBe(LogStatus.Completed);
        entries.Single(entry => entry.Id != theirs).UserId.ShouldBe(UserId);

        (await ColumnAsync(LogStatus.InProgress)).Items.ShouldHaveSingleItem().MediaId.ShouldBe(mediaId);
    }

    [Fact]
    public async Task Adding_an_unknown_title_is_a_404()
    {
        // The title is the resource addressed, so this is a 404 — where POST /api/log-entries,
        // which takes the id in its body, answers 400 for the same mistake.
        (await AddAsync(999_999, LogStatus.Backlog)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task A_column_nobody_has_heard_of_is_a_400()
    {
        var mediaId = await GivenGameAsync("Celeste");

        var response = await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}", new { status = "Wishlist" }, Json, Ct);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await EntriesAsync(mediaId)).ShouldBeEmpty();
    }

    // ---------------------------------------------------------------- telling others

    [Fact]
    public async Task Adding_a_game_asks_HowLongToBeat_whatever_the_column()
    {
        // Adding is the one gesture that fetches a title's metadata without a maintenance route,
        // and it is still adding when it goes straight to Completed. Queued rather than fetched,
        // so the reply does not wait on a site with no obligation to answer quickly.
        var mediaId = await GivenGameAsync("Celeste");

        await AddAsync(mediaId, LogStatus.Completed);

        HltbQueue.Enqueued.ShouldHaveSingleItem().ShouldBe(mediaId);
        Hltb.Searches.ShouldBeEmpty();
    }

    // ---------------------------------------------------------------- helpers

    private Task<HttpResponseMessage> AddAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync($"/api/library/{mediaId}", new AddToBoardRequest(status), Json, Ct);

    private Task<HttpResponseMessage> MoveAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<List<LogEntry>> EntriesAsync(int mediaId) => WithDbAsync(db => db.LogEntries
        .Where(entry => entry.MediaId == mediaId)
        .OrderBy(entry => entry.Id)
        .ToListAsync(Ct));

    private async Task<PagedResult<LibraryItemDto>> ColumnAsync(LogStatus status) =>
        await ReadAsync<PagedResult<LibraryItemDto>>(
            await Client.GetAsync($"/api/library?hobby=games&status={status}", Ct));

    /// <summary>A title already in a column, at a position the test chooses.</summary>
    private async Task GivenPlacedAsync(
        string title, string externalId, LogStatus status, int position)
    {
        var mediaId = await GivenGameAsync(title, externalId);

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                MediaId = mediaId,

                // Built by hand, so ownership is said out loud. An unowned pass is on nobody's
                // board, and the column this test reads would not contain it.
                UserId = UserId,

                Status = status,
                StartedAt = status == LogStatus.InProgress ? Eastern(2026, 9, 1) : null,
                LoggedAt = Clock.UtcNow,
                Position = position,
            });
            await db.SaveChangesAsync(Ct);
        });
    }
}
