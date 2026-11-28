using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Column ordering: the user's manual ranking, the read-only sort modes, and the year picker.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LibraryOrderingTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // --------------------------------------------------------- manual ranking

    [Fact]
    public async Task Newly_added_titles_appear_at_the_top()
    {
        await GivenBacklogAsync("First", "1");
        await GivenBacklogAsync("Second", "2");
        await GivenBacklogAsync("Third", "3");

        var column = await GetColumnAsync(LogStatus.Backlog);

        // min(position) - 1 puts each new entry on top without renumbering the rest. Adding a
        // game and not seeing it would be the worst possible first impression of the board.
        column.Items.Select(item => item.Title).ShouldBe(["Third", "Second", "First"]);
    }

    [Fact]
    public async Task Reordering_a_column_stores_the_order_sent()
    {
        var first = await GivenBacklogAsync("First", "1");
        var second = await GivenBacklogAsync("Second", "2");
        var third = await GivenBacklogAsync("Third", "3");

        var response = await ReorderAsync(LogStatus.Backlog, [second, third, first]);
        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);

        var column = await GetColumnAsync(LogStatus.Backlog);
        column.Items.Select(item => item.MediaId).ShouldBe([second, third, first]);
    }

    [Fact]
    public async Task A_stored_ranking_survives_a_reload()
    {
        var first = await GivenBacklogAsync("First", "1");
        var second = await GivenBacklogAsync("Second", "2");

        await ReorderAsync(LogStatus.Backlog, [first, second]);

        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.MediaId).ShouldBe([first, second]);
    }

    [Fact]
    public async Task Reordering_ignores_titles_that_have_since_left_the_column()
    {
        var stays = await GivenBacklogAsync("Stays", "1");
        var moved = await GivenBacklogAsync("Moved", "2");

        // Simulates a real race: the card was dragged to Playing in another tab between the
        // board loading and this drop landing. Rejecting the whole request would strand the
        // user's reorder over something harmless.
        await MoveAsync(moved, LogStatus.InProgress);

        var response = await ReorderAsync(LogStatus.Backlog, [moved, stays]);

        response.StatusCode.ShouldBe(HttpStatusCode.NoContent);
        (await GetColumnAsync(LogStatus.Backlog)).Items.ShouldHaveSingleItem().MediaId.ShouldBe(stays);
    }

    [Fact]
    public async Task Reordering_rejects_an_empty_list()
    {
        (await ReorderAsync(LogStatus.Backlog, [])).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
    }

    // ------------------------------------- a column partly loaded (#35)

    [Fact]
    public async Task A_reorder_of_the_first_hundred_leaves_the_rest_of_the_column_below_in_its_order()
    {
        // A column of 140 is drawn 100 at a time, and a drag sends what is drawn. The other 40
        // were never on screen, so they stay where they were: under every card that was.
        //
        // Numbered as adds number a column, each new title on top at min(position) - 1, so the
        // 40 not sent hold places a reorder starting from 0 would land the hundred under.
        var column = await GivenBacklogOfAsync(140);
        var loaded = column.Take(100).ToList();
        var rest = column.Skip(100).ToList();

        // The top card let go second.
        List<int> dragged = [loaded[1], loaded[0], .. loaded.Skip(2)];
        (await ReorderAsync(LogStatus.Backlog, dragged)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        (await WholeColumnAsync(LogStatus.Backlog)).ShouldBe([.. dragged, .. rest]);
    }

    [Fact]
    public async Task A_reorder_under_a_year_puts_that_years_titles_above_every_other_years()
    {
        // A board under 2026 draws Completed's 2026 finishes alone, so a drag there sends those
        // and nothing else. They go above every other year's as a block, and every other year
        // keeps its own order. Numbering the 2026 titles from 0 and leaving the rest where they
        // were is what interleaved the user's Completed year by year, card by card.
        var v24 = await GivenAddedToCompletedAsync("V", "1", 2024);
        var x25 = await GivenAddedToCompletedAsync("X", "2", 2025);
        var y26 = await GivenAddedToCompletedAsync("Y", "3", 2026);
        var z25 = await GivenAddedToCompletedAsync("Z", "4", 2025);
        var w26 = await GivenAddedToCompletedAsync("W", "5", 2026);

        (await WholeColumnAsync(LogStatus.Completed)).ShouldBe([w26, z25, y26, x25, v24]);
        (await WholeColumnAsync(LogStatus.Completed, year: 2026)).ShouldBe([w26, y26]);

        (await ReorderAsync(LogStatus.Completed, [y26, w26])).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        (await WholeColumnAsync(LogStatus.Completed)).ShouldBe([y26, w26, z25, x25, v24]);
        (await WholeColumnAsync(LogStatus.Completed, year: 2026)).ShouldBe([y26, w26]);
        (await WholeColumnAsync(LogStatus.Completed, year: 2025)).ShouldBe([z25, x25]);
    }

    [Fact]
    public async Task A_title_that_has_left_the_column_is_still_ignored_where_it_went()
    {
        // The race the order route has always forgiven, a card moved in another tab before this
        // drop landed, now that the route reads the whole column. The title left is not this
        // column's to number, so its place in the column it went to is as the move left it.
        var stays = await GivenAddedAsync("Stays", "1", LogStatus.Backlog);
        var playing = await GivenAddedAsync("Playing", "2", LogStatus.InProgress);
        var moved = await GivenAddedAsync("Moved", "3", LogStatus.Backlog);
        await MoveAsync(moved, LogStatus.InProgress);
        var before = await WholeColumnAsync(LogStatus.InProgress);

        (await ReorderAsync(LogStatus.Backlog, [moved, stays])).StatusCode
            .ShouldBe(HttpStatusCode.NoContent);

        (await WholeColumnAsync(LogStatus.Backlog)).ShouldBe([stays]);
        (await WholeColumnAsync(LogStatus.InProgress)).ShouldBe(before);
        before.ShouldBe([moved, playing]);
    }

    // ------------------------------------------------------------- sort modes

    [Fact]
    public async Task Manual_is_the_default_sort()
    {
        var first = await GivenBacklogAsync("Zebra", "1");
        var second = await GivenBacklogAsync("Alpha", "2");

        await ReorderAsync(LogStatus.Backlog, [first, second]);

        // No sort parameter, so the user's ranking wins over anything alphabetical.
        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.Title).ShouldBe(["Zebra", "Alpha"]);
    }

    [Fact]
    public async Task Sorting_by_title_is_alphabetical()
    {
        await GivenBacklogAsync("Zebra", "1");
        await GivenBacklogAsync("Alpha", "2");
        await GivenBacklogAsync("Mango", "3");

        var column = await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Title);

        column.Items.Select(item => item.Title).ShouldBe(["Alpha", "Mango", "Zebra"]);
    }

    [Fact]
    public async Task Sorting_by_added_puts_the_newest_first()
    {
        await GivenBacklogAsync("Oldest", "1");
        await GivenBacklogAsync("Newest", "2");

        var column = await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Added);

        column.Items.Select(item => item.Title).ShouldBe(["Newest", "Oldest"]);
    }

    [Fact]
    public async Task Sorting_by_rating_puts_the_best_first_and_unrated_last()
    {
        await GivenCompletedAsync("Good", "1", rating: 8m);
        await GivenCompletedAsync("Unrated", "2", rating: null);
        await GivenCompletedAsync("Great", "3", rating: 9.5m);

        var column = await GetColumnAsync(LogStatus.Completed, sort: LibrarySort.Rating);

        column.Items.Select(item => item.Title).ShouldBe(["Great", "Good", "Unrated"]);
    }

    [Theory]
    [InlineData(LibrarySort.Manual)]
    [InlineData(LibrarySort.Added)]
    [InlineData(LibrarySort.Title)]
    [InlineData(LibrarySort.Rating)]
    [InlineData(LibrarySort.Length)]
    public async Task Every_sort_breaks_a_tie_newest_pass_first_so_two_pages_hold_each_title_once(
        LibrarySort sort)
    {
        // A column past 100 is read a page at a time (#35), and Postgres promises no order among
        // rows that tie from one request to the next: page two can repeat a card page one showed
        // and skip another. So every sort ends on the newest pass first, My order's own
        // tie-break, and a column tied on everything reads newest first whichever it is in.
        // Built as adds build one, so My order is newest first too.
        var column = await GivenBacklogOfAsync(140);
        await WithDbAsync(async db =>
        {
            foreach (var entry in await db.LogEntries.ToListAsync(Ct))
            {
                entry.Rating = 8m;
            }

            foreach (var game in await db.Games.ToListAsync(Ct))
            {
                game.Title = "Tied";
                game.HltbAllStylesHours = 20m;
            }

            await db.SaveChangesAsync(Ct);
        });

        (await WholeColumnAsync(LogStatus.Backlog, sort: sort)).ShouldBe(column);
    }

    [Fact]
    public async Task Viewing_a_column_sorted_does_not_disturb_the_stored_ranking()
    {
        var zebra = await GivenBacklogAsync("Zebra", "1");
        var alpha = await GivenBacklogAsync("Alpha", "2");
        await ReorderAsync(LogStatus.Backlog, [zebra, alpha]);

        // Look at it alphabetically...
        (await GetColumnAsync(LogStatus.Backlog, sort: LibrarySort.Title)).Items
            .Select(item => item.Title).ShouldBe(["Alpha", "Zebra"]);

        // ...then switch back. The ranking must be exactly as it was left: sort modes are
        // read-only views, which is the whole reason dragging is disabled in them.
        (await GetColumnAsync(LogStatus.Backlog)).Items
            .Select(item => item.Title).ShouldBe(["Zebra", "Alpha"]);
    }

    // ------------------------------------------------------------ year filter

    [Fact]
    public async Task The_year_narrows_completed_titles_to_that_year()
    {
        await GivenCompletedAsync("Old", "1", completedOn: Eastern(2024, 6, 1));
        await GivenCompletedAsync("Recent", "2", completedOn: Eastern(2026, 6, 1));

        var column = await GetColumnAsync(LogStatus.Completed, year: 2026);

        column.Items.ShouldHaveSingleItem().Title.ShouldBe("Recent");
    }

    [Fact]
    public async Task Completions_with_no_date_appear_only_when_no_year_is_asked_for()
    {
        await GivenCompletedAsync("Undated", "1", completedOn: null);

        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
        (await GetColumnAsync(LogStatus.Completed, year: 2026)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task The_years_endpoint_lists_each_year_with_completions_once()
    {
        await GivenCompletedAsync("A", "1", completedOn: Eastern(2024, 6, 1));
        await GivenCompletedAsync("B", "2", completedOn: Eastern(2026, 1, 5));
        await GivenCompletedAsync("C", "3", completedOn: Eastern(2026, 8, 9));
        await GivenBacklogAsync("Unplayed", "4");

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));

        // Newest first, deduplicated, and a backlog title contributes nothing.
        years.ShouldBe([2026, 2024]);
    }

    [Fact]
    public async Task The_year_narrows_playing_titles_by_when_they_were_started()
    {
        // Playing has no completion date — the transition into it clears one — so the only date
        // it can answer to is the day it began. Filtering it on completed_at, which is what the
        // year meant while it was the Completed column's own control, empties the column
        // permanently instead.
        await GivenInProgressAsync("Started long ago", "1", startedOn: Eastern(2019, 3, 2));
        await GivenInProgressAsync("Started this year", "2", startedOn: Eastern(2026, 3, 2));

        (await GetColumnAsync(LogStatus.InProgress, year: 2019)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Started long ago");
    }

    [Fact]
    public async Task The_backlog_ignores_the_year_because_a_queue_is_not_a_record_of_one()
    {
        // Both timestamps are cleared by the rule that puts a title here, so a Backlog entry
        // belongs to no year at all and every year would show an empty well. The queue is what
        // you drag out of while you read a past year, so it is exempt from the question rather
        // than answering it with nothing.
        await GivenBacklogAsync("Waiting", "1");

        (await GetColumnAsync(LogStatus.Backlog, year: 2019)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Waiting");
        (await GetColumnAsync(LogStatus.Backlog, year: 2026)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Waiting");
    }

    [Fact]
    public async Task On_hold_ignores_the_year_because_it_is_a_list_you_come_back_to()
    {
        // The Backlog's argument, word for word: a title you paused is waiting on you whatever
        // year you are reading, and it is what you drag back out of. Narrowed on its start like
        // Playing, everything paused since last year would leave the board the first time
        // anything was logged in a new one — the board opens on the latest year there is.
        //
        // InYear's default arm is "either date", so this is also what notices On Hold falling
        // into it: exempt has to be said, and yearFor in board/keys.ts says it on the client.
        var paused = await GivenInProgressAsync("Paused", "1", startedOn: Eastern(2019, 3, 2));
        await MoveAsync(paused, LogStatus.OnHold);

        (await GetColumnAsync(LogStatus.OnHold, year: 2019)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Paused");
        (await GetColumnAsync(LogStatus.OnHold, year: 2026)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Paused");
    }

    [Fact]
    public async Task A_dropped_title_answers_to_the_year_it_was_started_or_finished_in()
    {
        // Dropping leaves the timestamps alone, deliberately, so what an abandoned title carries
        // depends on where it was abandoned from: a start, a completion from an earlier pass, or
        // neither. Either date puts it in a year.
        var started = await GivenInProgressAsync("Gave up on", "1", startedOn: Eastern(2019, 5, 5));
        await MoveAsync(started, LogStatus.Dropped);

        (await GetColumnAsync(LogStatus.Dropped, year: 2019)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Gave up on");
        (await GetColumnAsync(LogStatus.Dropped, year: 2026)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_title_dropped_out_of_the_backlog_is_on_this_years_board()
    {
        // The symptom the stamping rule exists for. A Backlog entry carries no dates by rule,
        // and Dropped is narrowed by either of them — so a card dragged straight from the queue
        // into Dropped used to leave the board entirely, findable only under All years, which
        // reads as a drag that lost the game rather than as a filter being strict.
        var waiting = await GivenBacklogAsync("Gave up before starting", "1");
        await MoveAsync(waiting, LogStatus.Dropped);

        (await GetColumnAsync(LogStatus.Dropped, year: 2026)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Gave up before starting");
    }

    [Fact]
    public async Task The_years_endpoint_offers_a_year_something_was_only_started_in()
    {
        // The picker's options and the columns' filter have to describe the same set of years.
        // While the year meant completions alone, a year you began something in and finished
        // nothing in was unreachable — the Playing column would have filtered on it correctly
        // and there was no way to ask for it.
        await GivenInProgressAsync("Still going", "1", startedOn: Eastern(2019, 3, 2));
        await GivenCompletedAsync("Finished", "2", completedOn: Eastern(2024, 6, 1));

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));

        years.ShouldBe([2024, 2019]);
    }

    [Fact]
    public async Task A_completion_late_on_new_years_eve_belongs_to_the_year_it_was_here()
    {
        // 8pm on the 31st here is already the 1st in UTC. Extracting the year from the stored
        // instant without saying in which zone would file this under 2027 — and the year view
        // would quietly lose a game every time someone finished one on New Year's Eve.
        await GivenCompletedAsync("Midnight Run", "1", completedOn: Eastern(2026, 12, 31, 20, 0));

        (await GetColumnAsync(LogStatus.Completed, year: 2026)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Midnight Run");
        (await GetColumnAsync(LogStatus.Completed, year: 2027)).Items.ShouldBeEmpty();

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));
        years.ShouldBe([2026]);
    }

    // ------------------------------------------- a date kept as a year (#24)

    [Fact]
    public async Task A_finish_kept_as_a_year_is_in_that_years_completed_column_and_no_other()
    {
        // Filed under the year it was, and never under this one, which is what an add straight to
        // Completed stamping today used to do. Compared with the year asked for as a number: a
        // kept year never meets the zone.
        var mediaId = await GivenGameAsync("Hollow Knight", "1");
        await GivenLogEntryAsync(mediaId, LogStatus.Completed, completedYear: 2019);

        (await GetColumnAsync(LogStatus.Completed, year: 2019)).Items
            .ShouldHaveSingleItem().Title.ShouldBe("Hollow Knight");
        (await GetColumnAsync(LogStatus.Completed, year: 2026)).Items.ShouldBeEmpty();
        (await GetColumnAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task A_finish_kept_as_a_year_files_by_the_finish_and_not_the_start()
    {
        // Begun on a day in 2018 and finished in 2019 is a 2019 completion, whichever kind each
        // date is: Completed's own rule, read across both.
        var mediaId = await GivenGameAsync("Hollow Knight", "1");
        await GivenLogEntryAsync(
            mediaId, LogStatus.Completed, startedAt: Eastern(2018, 6, 1), completedYear: 2019);

        (await GetColumnAsync(LogStatus.Completed, year: 2018)).Items.ShouldBeEmpty();
        (await GetColumnAsync(LogStatus.Completed, year: 2019)).Items.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task A_playing_game_begun_in_a_year_is_on_that_years_board()
    {
        // Every pass takes a year, whatever its column, round one's pick: a Playing game begun in
        // 2019 files under 2019.
        var mediaId = await GivenGameAsync("Still going", "1");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress, startedYear: 2019);

        (await GetColumnAsync(LogStatus.InProgress, year: 2019)).Items.ShouldHaveSingleItem();
        (await GetColumnAsync(LogStatus.InProgress, year: 2026)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_dropped_title_answers_to_a_year_kept_for_either_date()
    {
        var mediaId = await GivenGameAsync("Gave up on", "1");
        await GivenLogEntryAsync(mediaId, LogStatus.Dropped, startedYear: 2017, completedYear: 2019);

        (await GetColumnAsync(LogStatus.Dropped, year: 2017)).Items.ShouldHaveSingleItem();
        (await GetColumnAsync(LogStatus.Dropped, year: 2019)).Items.ShouldHaveSingleItem();
        (await GetColumnAsync(LogStatus.Dropped, year: 2018)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task The_years_endpoint_offers_a_year_only_a_kept_year_is_in()
    {
        // A board opens on the latest year there is and offers the rest, so a year only kept years
        // are in has to be on the list, or its titles are under All years alone.
        await GivenCompletedAsync("Dated", "1", completedOn: Eastern(2024, 6, 1));
        var finishedIn = await GivenGameAsync("Finished in 2019", "2");
        await GivenLogEntryAsync(finishedIn, LogStatus.Completed, completedYear: 2019);
        var begunIn = await GivenGameAsync("Begun in 2017", "3");
        await GivenLogEntryAsync(begunIn, LogStatus.InProgress, startedYear: 2017);

        var years = await ReadAsync<List<int>>(
            await Client.GetAsync("/api/library/years?hobby=games", Ct));

        years.ShouldBe([2024, 2019, 2017]);
    }

    [Fact]
    public async Task Length_puts_the_shortest_first_and_the_unknown_last()
    {
        // That the column comes back non-empty is half of what this asserts. The estimate lives
        // on `games`, so ordering by it needs a TPT downcast — and when one of those fails to
        // translate, the symptom is an empty column rather than an error that names itself.
        await GivenBacklogWithEstimateAsync("Long", "1", 53.44m);
        await GivenBacklogWithEstimateAsync("Short", "2", 8.32m);
        await GivenBacklogWithEstimateAsync("Unmatched", "3", estimate: null);
        await GivenBacklogWithEstimateAsync("Middling", "4", 27m);

        var column = await GetColumnAsync(LogStatus.Backlog, LibrarySort.Length);

        // Shortest first: the question the sort answers is "what can I finish this weekend".
        // Unknown last in the same spirit as an unrated title, rather than sorting as though
        // a game nobody has timed takes no time at all.
        column.Items.Select(item => item.Title)
            .ShouldBe(["Short", "Middling", "Long", "Unmatched"]);
    }

    [Fact]
    public async Task Sorting_by_length_leaves_the_stored_ranking_alone()
    {
        // Every mode but manual is a read-only view. This is the promise that lets the board
        // offer dragging in one mode only and still guarantee the ranking survives a look.
        var first = await GivenBacklogWithEstimateAsync("Long", "1", 53.44m);
        var second = await GivenBacklogWithEstimateAsync("Short", "2", 8.32m);
        await ReorderAsync(LogStatus.Backlog, [first, second]);

        await GetColumnAsync(LogStatus.Backlog, LibrarySort.Length);

        (await GetColumnAsync(LogStatus.Backlog)).Items.Select(item => item.Title)
            .ShouldBe(["Long", "Short"]);
    }

    // ----------------------------------------------------------------- helpers

    private async Task<int> GivenBacklogWithEstimateAsync(
        string title, string externalId, decimal? estimate)
    {
        var mediaId = await GivenBacklogAsync(title, externalId);

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbAllStylesHours = estimate;
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }

    private async Task<int> GivenBacklogAsync(string title, string externalId)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Json,
            Ct);
        return mediaId;
    }

    private async Task<int> GivenInProgressAsync(
        string title, string externalId, DateTimeOffset? startedOn = null)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(
                mediaId, LogStatus.InProgress, null, null, startedOn, null, null),
            Json,
            Ct);
        return mediaId;
    }

    private async Task<int> GivenCompletedAsync(
        string title, string externalId, decimal? rating = null, DateTimeOffset? completedOn = null)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        await Client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, LogStatus.Completed, rating, null, null, completedOn, null),
            Json,
            Ct);
        return mediaId;
    }

    /// <summary>
    /// A Backlog of <paramref name="count"/> games, numbered as adding each in turn numbers one:
    /// every title on top of the last at <c>min(position) - 1</c>. In one save rather than through
    /// the add route a title at a time, which would say the same at 140 times the cost. Returned
    /// top first, as the column is drawn.
    /// </summary>
    private Task<List<int>> GivenBacklogOfAsync(int count) => WithDbAsync(async db =>
    {
        var games = Enumerable.Range(1, count)
            .Select(number => new Game
            {
                HobbyId = SeedData.Hobbies.Games,
                SourceId = SeedData.Sources.Igdb,
                ExternalId = $"{number}",
                Title = $"Title {number:D3}",
            })
            .ToList();

        db.Games.AddRange(games);
        await db.SaveChangesAsync(Ct);

        db.LogEntries.AddRange(games.Select((game, index) => new LogEntry
        {
            MediaId = game.Id,
            UserId = UserId,
            Status = LogStatus.Backlog,
            Position = -(index + 1),
            LoggedAt = Clock.UtcNow,
        }));
        await db.SaveChangesAsync(Ct);

        return games.Select(game => game.Id).Reverse().ToList();
    });

    /// <summary>A game put on the board as a tile puts one there, on top of its column.</summary>
    private async Task<int> GivenAddedAsync(string title, string externalId, LogStatus status)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        var response = await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}", new AddToBoardRequest(status), Json, Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        return mediaId;
    }

    /// <summary>A game added to Completed finished in a year, as the tile's check mark adds one.</summary>
    private async Task<int> GivenAddedToCompletedAsync(string title, string externalId, int year)
    {
        var mediaId = await GivenGameAsync(title, externalId);
        var response = await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}",
            new AddToBoardRequest(LogStatus.Completed, CompletedYear: year),
            Json,
            Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.Created);
        return mediaId;
    }

    /// <summary>A whole column, top first, read a page of 100 at a time as a board reads one.</summary>
    private async Task<List<int>> WholeColumnAsync(
        LogStatus status, int? year = null, LibrarySort? sort = null)
    {
        var ids = new List<int>();

        for (var page = 1; ; page++)
        {
            var url = $"/api/library?hobby=games&status={status}&page={page}&pageSize=100";
            if (year is { } wanted) url += $"&year={wanted}";
            if (sort is { } chosen) url += $"&sort={chosen}";

            var column = await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
            ids.AddRange(column.Items.Select(item => item.MediaId));

            if (column.Items.Count == 0 || ids.Count >= column.Total)
            {
                return ids;
            }
        }
    }

    private Task<HttpResponseMessage> MoveAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<HttpResponseMessage> ReorderAsync(LogStatus status, IReadOnlyList<int> mediaIds) =>
        Client.PutAsJsonAsync(
            "/api/library/order", new ReorderRequest("games", status, mediaIds), Json, Ct);

    private async Task<PagedResult<LibraryItemDto>> GetColumnAsync(
        LogStatus status, LibrarySort? sort = null, int? year = null)
    {
        var url = $"/api/library?hobby=games&status={status}";
        if (sort is { } chosen) url += $"&sort={chosen}";
        if (year is { } wanted) url += $"&year={wanted}";

        return await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
    }
}
