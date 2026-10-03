using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The Stats page's two routes: a year of one hobby, and the years there are.
///
/// <para>
/// Stats count playthroughs where the board counts titles, so most of these arrange something the
/// board would answer differently — a replay, a second finish, a pass started in one year and
/// finished in the next — and say which answer stats gives. Passes are written through the API
/// wherever the column history matters, because the fixtures' own context records none.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class StatsEndpointTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // ------------------------------------------------------------------ finished

    [Fact]
    public async Task A_finish_still_counts_in_its_year_after_the_game_is_replayed()
    {
        // The board shows the title once, by its latest pass, so the replay takes it out of 2026's
        // Completed column. Stats are what happened, and it was finished in March.
        var celeste = await GivenGameAsync("Celeste");
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 3, 1));
        (await MoveAsync(celeste, LogStatus.InProgress)).EnsureSuccessStatusCode();

        var stats = await StatsAsync(year: 2026);

        stats.Finished.ShouldHaveSingleItem().Title.ShouldBe("Celeste");
        (await ColumnAsync(LogStatus.Completed, year: 2026)).Items.ShouldBeEmpty();
    }

    [Fact]
    public async Task A_game_finished_twice_in_a_year_is_two_finishes()
    {
        var celeste = await GivenGameAsync("Celeste");
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 2, 1));
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 8, 1));

        var stats = await StatsAsync(year: 2026);

        stats.Finished.Count.ShouldBe(2);
        stats.Finished.ShouldAllBe(finish => finish.MediaId == celeste);
    }

    [Fact]
    public async Task A_finish_at_8pm_on_new_years_eve_belongs_to_that_year()
    {
        // 8pm on the 31st here is already the 1st in UTC. Read in the wrong zone, the finish
        // would move into next year's stats while its card stayed in this year's column.
        await LogAsync(
            await GivenGameAsync("Midnight Run", "1"), LogStatus.Completed,
            completedAt: Eastern(2025, 12, 31, 20, 0));
        await LogAsync(
            await GivenGameAsync("New Year", "2"), LogStatus.Completed,
            completedAt: Eastern(2026, 1, 1, 0, 30));

        (await StatsAsync(year: 2025)).Finished.ShouldHaveSingleItem().Title.ShouldBe("Midnight Run");
        (await StatsAsync(year: 2026)).Finished.ShouldHaveSingleItem().Title.ShouldBe("New Year");
    }

    [Fact]
    public async Task Finishes_come_oldest_first_with_the_cover_and_the_figures_of_each_pass()
    {
        var hades = await GivenGameAsync("Hades", "1", coverUrl: "https://example.test/hades.jpg");
        var celeste = await GivenGameAsync("Celeste", "2");
        await LogAsync(hades, LogStatus.Completed, completedAt: Eastern(2026, 5, 1),
            rating: 9m, hoursPlayed: 24.5m);
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 1, 18));

        var finished = (await StatsAsync(year: 2026)).Finished;

        finished.Select(finish => finish.Title).ShouldBe(["Celeste", "Hades"]);

        var last = finished[1];
        last.MediaId.ShouldBe(hades);
        last.CoverUrl.ShouldBe("https://example.test/hades.jpg");
        last.CompletedAt.ShouldBe(Eastern(2026, 5, 1));
        last.Rating.ShouldBe(9m);
        last.HoursPlayed.ShouldBe(24.5m);
    }

    [Fact]
    public async Task Only_a_pass_in_completed_is_a_finish()
    {
        // A dropped pass can carry a finish date — the drawer writes every field, and dropping
        // leaves a completion alone — and it is still not a game you finished.
        await LogAsync(
            await GivenGameAsync("Abandoned", "1"), LogStatus.Dropped,
            startedAt: Eastern(2026, 2, 1), completedAt: Eastern(2026, 3, 1));
        await LogAsync(
            await GivenGameAsync("Still Going", "2"), LogStatus.InProgress,
            startedAt: Eastern(2026, 4, 1));

        (await StatsAsync(year: 2026)).Finished.ShouldBeEmpty();
    }

    [Fact]
    public async Task All_years_counts_every_finish_and_one_with_no_date_comes_last()
    {
        // Marked finished with its date cleared: the route allows it. It belongs to no year, and
        // to all of them.
        await LogAsync(await GivenGameAsync("Undated", "1"), LogStatus.Completed);
        await LogAsync(
            await GivenGameAsync("Dated", "2"), LogStatus.Completed,
            completedAt: Eastern(2024, 6, 1));

        var everything = await StatsAsync(year: null);

        everything.Finished.Select(finish => finish.Title).ShouldBe(["Dated", "Undated"]);
        everything.Finished[1].CompletedAt.ShouldBeNull();
        (await StatsAsync(year: 2024)).Finished.ShouldHaveSingleItem().Title.ShouldBe("Dated");
    }

    // ------------------------------------------------------------------ hours

    [Fact]
    public async Task Hours_compare_only_the_finishes_that_have_both_figures()
    {
        // The column header's rules: a missing figure is left out and counted, never added as
        // nought, and the comparison is over the passes that have both.
        await FinishAsync("Celeste", "1", estimate: 20m, hoursPlayed: 14.5m);
        await FinishAsync("Outer Wilds", "2", estimate: 17m, hoursPlayed: 21m);
        await FinishAsync("Hi-Fi Rush", "3", estimate: 13m, hoursPlayed: null);
        await FinishAsync("Untimed", "4", estimate: null, hoursPlayed: 5m);

        var hours = (await StatsAsync(year: 2026)).Hours;

        hours.Played.ShouldBe(35.5m);
        hours.PlayedLength.ShouldBe(37m);
        hours.PlayedTitles.ShouldBe(2);
        hours.Length.ShouldBe(50m);
        hours.LengthTitles.ShouldBe(3);
    }

    [Fact]
    public async Task With_nothing_timed_there_is_no_comparison_rather_than_one_of_nothing()
    {
        await FinishAsync("Stardew Valley", "1", estimate: null, hoursPlayed: null);

        var hours = (await StatsAsync(year: 2026)).Hours;

        hours.Played.ShouldBeNull();
        hours.PlayedLength.ShouldBeNull();
        hours.PlayedTitles.ShouldBe(0);
        hours.Length.ShouldBeNull();
        hours.LengthTitles.ShouldBe(0);
    }

    [Fact]
    public async Task A_game_finished_twice_brings_both_playthroughs_hours()
    {
        // Where the header counts the title once by its latest pass, a year of playthroughs
        // counts each — with the estimate on both sides, so the comparison stays like for like.
        var celeste = await GivenGameWithEstimateAsync("Celeste", "1", 20m);
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 2, 1), hoursPlayed: 22m);
        await LogAsync(celeste, LogStatus.Completed, completedAt: Eastern(2026, 8, 1), hoursPlayed: 9m);

        var hours = (await StatsAsync(year: 2026)).Hours;

        hours.Played.ShouldBe(31m);
        hours.PlayedLength.ShouldBe(40m);
        hours.PlayedTitles.ShouldBe(2);
    }

    [Fact]
    public async Task A_finish_carries_the_name_and_the_length_its_card_prints_for_every_hobby()
    {
        // The length is the coalesce the board's projections build LengthHours from, copied once
        // more, and the name is the one a card leads with. This holds the copies to the cards: for
        // each hobby, what stats says about a finish is what its card says. The film's runtime is
        // chosen not to divide into hundredths of an hour, so a copy that skipped the rounding
        // would be a fraction of a minute out.
        await LogAsync(
            await GivenGameWithEstimateAsync("Celeste", "1", 20.25m),
            LogStatus.Completed, completedAt: Eastern(2026, 3, 1));
        await LogAsync(
            await GivenMovieAsync("Arrival", "1", runtimeMinutes: 116),
            LogStatus.Completed, completedAt: Eastern(2026, 3, 1));
        await LogAsync(
            await GivenShowAsync("Severance", "1", numberOfEpisodes: 19, episodeRuntimeMinutes: 47),
            LogStatus.Completed, completedAt: Eastern(2026, 3, 1));
        await LogAsync(
            await GivenAnimeAsync(
                "Sousou no Frieren", "1", englishTitle: "Frieren: Beyond Journey's End",
                episodeCount: 28, episodeRuntimeSeconds: 1440),
            LogStatus.Completed, completedAt: Eastern(2026, 3, 1));

        foreach (var hobby in new[] { "games", "movies", "tv", "anime" })
        {
            var card = (await ColumnAsync(LogStatus.Completed, hobby: hobby)).Items.ShouldHaveSingleItem();
            var finish = (await StatsAsync(year: 2026, hobby: hobby)).Finished.ShouldHaveSingleItem();

            finish.LengthHours.ShouldNotBeNull(hobby);
            finish.LengthHours.ShouldBe(card.LengthHours, hobby);
            finish.Title.ShouldBe(card.Title, hobby);
        }
    }

    // ------------------------------------------------------------------ completion

    [Fact]
    public async Task Completion_counts_what_was_started_in_the_year_by_where_it_is_now()
    {
        await LogAsync(await GivenGameAsync("Finished", "1"), LogStatus.Completed,
            startedAt: Eastern(2026, 2, 1), completedAt: Eastern(2026, 3, 1));
        await LogAsync(await GivenGameAsync("Dropped", "2"), LogStatus.Dropped,
            startedAt: Eastern(2026, 4, 1));
        await LogAsync(await GivenGameAsync("Playing", "3"), LogStatus.InProgress,
            startedAt: Eastern(2026, 5, 1));
        await LogAsync(await GivenGameAsync("Paused", "4"), LogStatus.OnHold,
            startedAt: Eastern(2026, 6, 1));
        await LogAsync(await GivenGameAsync("Queued", "5"), LogStatus.Backlog);

        // Started the year before and finished in this one: last year's start, so last year's
        // completion — and this year's finish.
        await LogAsync(await GivenGameAsync("Carried Over", "6"), LogStatus.Completed,
            startedAt: Eastern(2025, 12, 1), completedAt: Eastern(2026, 1, 10));

        (await StatsAsync(year: 2026)).Completion.ShouldBe(new CompletionDto(1, 2, 1));
        (await StatsAsync(year: 2025)).Completion.ShouldBe(new CompletionDto(1, 0, 0));
        (await StatsAsync(year: 2026)).Finished.Count.ShouldBe(2);
    }

    [Fact]
    public async Task A_finish_with_no_start_counts_as_started_when_it_finished()
    {
        // What adding a title straight to Completed leaves: a finish, and nothing else.
        (await AddAsync(await GivenGameAsync("Added Finished"), LogStatus.Completed))
            .EnsureSuccessStatusCode();

        (await StatsAsync(year: 2026)).Completion.ShouldBe(new CompletionDto(1, 0, 0));
    }

    [Fact]
    public async Task A_pass_in_backlog_has_not_started_whatever_date_it_carries()
    {
        // The move into Backlog clears both dates, so one here is left over from an edit — and
        // the board ignores it in the same way, by leaving Backlog out of every year.
        await LogAsync(
            await GivenGameAsync("Queued"), LogStatus.Backlog, startedAt: Eastern(2026, 3, 1));

        (await StatsAsync(year: 2026)).Completion.ShouldBe(new CompletionDto(0, 0, 0));
    }

    [Fact]
    public async Task A_start_at_8pm_on_new_years_eve_belongs_to_that_year()
    {
        await LogAsync(await GivenGameAsync("Late Start"), LogStatus.InProgress,
            startedAt: Eastern(2025, 12, 31, 20, 0));

        (await StatsAsync(year: 2025)).Completion.ShouldBe(new CompletionDto(0, 1, 0));
        (await StatsAsync(year: 2026)).Completion.ShouldBe(new CompletionDto(0, 0, 0));
    }

    [Fact]
    public async Task All_years_counts_every_pass_that_has_left_the_backlog()
    {
        // Including a dropped pass with no dates at all, which only POST can write: it belongs to
        // no year and is still a game you gave up on.
        await LogAsync(await GivenGameAsync("Old Finish", "1"), LogStatus.Completed,
            startedAt: Eastern(2024, 1, 1), completedAt: Eastern(2024, 2, 1));
        await LogAsync(await GivenGameAsync("Dateless Drop", "2"), LogStatus.Dropped);
        await LogAsync(await GivenGameAsync("Playing", "3"), LogStatus.InProgress,
            startedAt: Eastern(2026, 5, 1));
        await LogAsync(await GivenGameAsync("Queued", "4"), LogStatus.Backlog);

        (await StatsAsync(year: null)).Completion.ShouldBe(new CompletionDto(1, 1, 1));
    }

    // ------------------------------------------------------------------ backlog

    [Fact]
    public async Task The_backlog_is_the_column_oldest_first_with_when_each_title_arrived()
    {
        // Logged before the history began: a pass the fixtures' context writes has no rows at all,
        // so all there is to say is when it was made.
        var start = Clock.UtcNow;
        await GivenLogEntryAsync(await GivenGameAsync("Before History", "1"), LogStatus.Backlog);

        Clock.UtcNow = start.AddDays(3);
        (await AddAsync(await GivenGameAsync("Added Later", "2"), LogStatus.Backlog))
            .EnsureSuccessStatusCode();

        // Not in the column: one being played, and one waiting on the release calendar instead.
        (await AddAsync(await GivenGameAsync("Being Played", "3"), LogStatus.InProgress))
            .EnsureSuccessStatusCode();
        var unreleased = await GivenGameAsync("Not Out Yet", "4");
        (await AddAsync(unreleased, LogStatus.Backlog)).EnsureSuccessStatusCode();
        await GivenReleaseDayAsync(unreleased, new DateOnly(2027, 3, 12));

        var backlog = (await StatsAsync(year: 2026)).Backlog;

        backlog.Select(title => title.Title).ShouldBe(["Before History", "Added Later"]);

        backlog[0].LoggedAt.ShouldBe(start);
        backlog[0].InBacklogSince.ShouldBeNull();

        backlog[1].LoggedAt.ShouldBe(start.AddDays(3));
        backlog[1].InBacklogSince.ShouldBe(start.AddDays(3));
    }

    [Fact]
    public async Task A_title_back_in_the_backlog_has_waited_since_it_came_back()
    {
        var start = Clock.UtcNow;
        var celeste = await GivenGameAsync("Celeste");
        (await AddAsync(celeste, LogStatus.Backlog)).EnsureSuccessStatusCode();

        // Each move well outside the ten minutes a shuffle folds inside.
        Clock.UtcNow = start.AddDays(2);
        (await MoveAsync(celeste, LogStatus.InProgress)).EnsureSuccessStatusCode();
        Clock.UtcNow = start.AddDays(5);
        (await MoveAsync(celeste, LogStatus.Backlog)).EnsureSuccessStatusCode();

        var title = (await StatsAsync(year: 2026)).Backlog.ShouldHaveSingleItem();

        title.LoggedAt.ShouldBe(start);
        title.InBacklogSince.ShouldBe(start.AddDays(5));
    }

    [Fact]
    public async Task A_title_whose_last_recorded_move_was_elsewhere_has_no_arrival_to_claim()
    {
        // History says it went to Playing, and a write around the recorder put it back. The last
        // arrival the history knows is not into Backlog, so it knows nothing about this one —
        // and an older arrival into Backlog would claim a wait that was interrupted.
        var celeste = await GivenGameAsync("Celeste");
        (await AddAsync(celeste, LogStatus.Backlog)).EnsureSuccessStatusCode();
        Clock.UtcNow = Clock.UtcNow.AddDays(1);
        (await MoveAsync(celeste, LogStatus.InProgress)).EnsureSuccessStatusCode();

        await WithDbAsync(async db =>
        {
            var pass = await db.LogEntries.SingleAsync(entry => entry.MediaId == celeste, Ct);
            pass.Status = LogStatus.Backlog;
            pass.StartedAt = null;
            await db.SaveChangesAsync(Ct);
        });

        (await StatsAsync(year: 2026)).Backlog.ShouldHaveSingleItem().InBacklogSince.ShouldBeNull();
    }

    [Fact]
    public async Task A_title_in_the_backlog_is_named_as_its_card_is()
    {
        // The backlog list is a third projection of a board row, so it carries the name a card
        // leads with: MAL's English title for an anime, where the card has one.
        await GivenLogEntryAsync(
            await GivenAnimeAsync("Sousou no Frieren", "1", englishTitle: "Frieren: Beyond Journey's End"),
            LogStatus.Backlog);

        var card = (await ColumnAsync(LogStatus.Backlog, hobby: "anime")).Items.ShouldHaveSingleItem();

        (await StatsAsync(year: 2026, hobby: "anime")).Backlog.ShouldHaveSingleItem()
            .Title.ShouldBe(card.Title);
        card.Title.ShouldBe("Frieren: Beyond Journey's End");
    }

    [Fact]
    public async Task The_backlog_is_the_same_whatever_year_is_asked_for()
    {
        await GivenLogEntryAsync(await GivenGameAsync("Queued"), LogStatus.Backlog);

        (await StatsAsync(year: 2019)).Backlog.ShouldHaveSingleItem().Title.ShouldBe("Queued");
        (await StatsAsync(year: null)).Backlog.ShouldHaveSingleItem().Title.ShouldBe("Queued");
    }

    // ------------------------------------------------------------------ years

    [Fact]
    public async Task The_years_include_one_that_only_a_replayed_finish_was_in()
    {
        // The board's years are its current passes', so a game finished in 2024 and replayed now
        // leaves 2024 off the board's list. Its finish is still a 2024 finish, and the Stats page
        // has to be able to ask for that year.
        var celeste = await GivenGameAsync("Celeste");
        await LogAsync(celeste, LogStatus.Completed,
            startedAt: Eastern(2024, 2, 1), completedAt: Eastern(2024, 3, 2));
        (await MoveAsync(celeste, LogStatus.InProgress)).EnsureSuccessStatusCode();

        (await YearsAsync()).ShouldBe([2026, 2024]);
        (await ReadAsync<int[]>(await Client.GetAsync("/api/library/years?hobby=games", Ct)))
            .ShouldBe([2026]);
    }

    [Fact]
    public async Task A_date_left_on_a_backlog_pass_offers_no_year()
    {
        // A pass in Backlog has not started, so its year would open on a page with nothing in it.
        await LogAsync(
            await GivenGameAsync("Queued", "1"), LogStatus.Backlog, startedAt: Eastern(2023, 3, 1));
        await LogAsync(
            await GivenGameAsync("Finished", "2"), LogStatus.Completed, completedAt: Eastern(2026, 3, 1));

        (await YearsAsync()).ShouldBe([2026]);
    }

    [Fact]
    public async Task A_year_is_the_one_it_was_evening_in()
    {
        await LogAsync(await GivenGameAsync("Midnight Run"), LogStatus.Completed,
            completedAt: Eastern(2025, 12, 31, 20, 0));

        (await YearsAsync()).ShouldBe([2025]);
    }

    // ------------------------------------------------------------------ whose

    [Fact]
    public async Task Somebody_elses_passes_never_reach_your_stats()
    {
        // The titles are shared and the passes are not. A stranger finishing, starting and
        // queueing the very game you finished must change nothing you can see.
        var celeste = await GivenGameWithEstimateAsync("Celeste", "1", 20m);
        await LogAsync(celeste, LogStatus.Completed,
            startedAt: Eastern(2026, 2, 1), completedAt: Eastern(2026, 3, 1), hoursPlayed: 14m);

        var stranger = ClientFor(await GivenUserAsync("Somebody Else"));
        await LogAsync(celeste, LogStatus.Completed,
            startedAt: Eastern(2025, 2, 1), completedAt: Eastern(2025, 3, 1), hoursPlayed: 60m,
            client: stranger);
        await LogAsync(await GivenGameAsync("Their Drop", "2"), LogStatus.Dropped,
            startedAt: Eastern(2026, 4, 1), client: stranger);
        await LogAsync(await GivenGameAsync("Their Queue", "3"), LogStatus.Backlog, client: stranger);

        var stats = await StatsAsync(year: 2026);

        stats.Finished.ShouldHaveSingleItem().HoursPlayed.ShouldBe(14m);
        stats.Hours.Played.ShouldBe(14m);
        stats.Completion.ShouldBe(new CompletionDto(1, 0, 0));
        stats.Backlog.ShouldBeEmpty();
        (await YearsAsync()).ShouldBe([2026]);
    }

    // ------------------------------------------------------------------ asking

    [Fact]
    public async Task An_unknown_hobby_is_refused_rather_than_answered_with_nothing()
    {
        (await Client.GetAsync("/api/stats?hobby=knitting", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);
        (await Client.GetAsync("/api/stats/years?hobby=knitting", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(9999)]
    public async Task A_year_with_no_calendar_span_is_refused_rather_than_a_500(int year)
    {
        // Year 0 has no first instant, and 9999's span would end in a year DateTime cannot hold.
        (await Client.GetAsync($"/api/stats?hobby=games&year={year}", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Nobody_signed_in_gets_a_401()
    {
        (await AnonymousClient.GetAsync("/api/stats?hobby=games", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.GetAsync("/api/stats/years?hobby=games", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
    }

    // ------------------------------------------------------------------ helpers

    /// <summary>A pass through the journal's own route, so it is written as the app writes one.</summary>
    private async Task LogAsync(
        int mediaId,
        LogStatus status,
        DateTimeOffset? startedAt = null,
        DateTimeOffset? completedAt = null,
        decimal? rating = null,
        decimal? hoursPlayed = null,
        HttpClient? client = null)
    {
        var response = await (client ?? Client).PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, status, rating, null, startedAt, completedAt, hoursPlayed),
            Json,
            Ct);

        response.EnsureSuccessStatusCode();
    }

    /// <summary>A game with an All Styles estimate on it, finished this year with these hours.</summary>
    private async Task FinishAsync(
        string title, string externalId, decimal? estimate, decimal? hoursPlayed)
    {
        var mediaId = await GivenGameWithEstimateAsync(title, externalId, estimate);
        await LogAsync(mediaId, LogStatus.Completed, completedAt: Eastern(2026, 3, 1),
            hoursPlayed: hoursPlayed);
    }

    private async Task<int> GivenGameWithEstimateAsync(
        string title, string externalId, decimal? estimate)
    {
        var mediaId = await GivenGameAsync(title, externalId);

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbAllStylesHours = estimate;
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }

    /// <summary>A day it comes out on after the clock's today, so it is on the calendar.</summary>
    private Task GivenReleaseDayAsync(int mediaId, DateOnly day) => WithDbAsync(async db =>
    {
        var window = ReleaseWindow.For(day, ReleasePrecision.Day);

        var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
        media.ReleaseDate = window.Start;
        media.ReleaseEnd = window.End;
        media.ReleasePrecision = window.Precision;

        await db.SaveChangesAsync(Ct);
    });

    private Task<HttpResponseMessage> MoveAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status", new StatusTransitionRequest(status), Json, Ct);

    private Task<HttpResponseMessage> AddAsync(int mediaId, LogStatus status) =>
        Client.PostAsJsonAsync($"/api/library/{mediaId}", new AddToBoardRequest(status), Json, Ct);

    private async Task<StatsDto> StatsAsync(int? year, string hobby = "games")
    {
        var url = $"/api/stats?hobby={hobby}";
        if (year is { } wanted) url += $"&year={wanted}";

        var response = await Client.GetAsync(url, Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await ReadAsync<StatsDto>(response);
    }

    private async Task<int[]> YearsAsync(string hobby = "games")
    {
        var response = await Client.GetAsync($"/api/stats/years?hobby={hobby}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        return await ReadAsync<int[]>(response);
    }

    private async Task<LibraryPage> ColumnAsync(LogStatus status, string hobby = "games", int? year = null)
    {
        var url = $"/api/library?hobby={hobby}&status={status}";
        if (year is { } wanted) url += $"&year={wanted}";

        return await ReadAsync<LibraryPage>(await Client.GetAsync(url, Ct));
    }
}
