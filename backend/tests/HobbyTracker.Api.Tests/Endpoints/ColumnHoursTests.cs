using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// What a column's header says about how long its titles take: the figure each card prints,
/// added up, and on Completed your own hours against it.
///
/// <para>
/// Every figure is about the whole column, and the cards a column draws are only one page of
/// it. So most of these arrange something the page alone would get wrong — a second page, a
/// year boundary, a title the column leaves out, somebody else's pass — and ask whether the
/// header agrees with the column.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class ColumnHoursTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task The_total_covers_the_whole_column_and_not_just_the_page()
    {
        // A column is paged at a hundred. A header that added up the page it was handed would
        // disagree with its own count the day a column passed that.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        await GivenGameInAsync("Hades", "2", LogStatus.Backlog, estimate: 42m);
        await GivenGameInAsync("Hollow Knight", "3", LogStatus.Backlog, estimate: 41.8m);

        var column = await ColumnAsync(LogStatus.Backlog, pageSize: 2);

        column.Items.Count.ShouldBe(2);
        column.Hours.Length.ShouldBe(103.8m);
        column.Hours.LengthTitles.ShouldBe(3);
    }

    [Fact]
    public async Task A_title_with_no_estimate_is_left_out_rather_than_counted_as_nothing()
    {
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        await GivenGameInAsync("Stardew Valley", "2", LogStatus.Backlog, estimate: null);

        var column = await ColumnAsync(LogStatus.Backlog);

        // Two titles, one of them timed. The header counts the other rather than adding it as
        // nought, which would claim the column takes less time than it does.
        column.Total.ShouldBe(2);
        column.Hours.Length.ShouldBe(20m);
        column.Hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task A_column_with_no_estimate_in_it_has_no_total_rather_than_a_total_of_nothing()
    {
        // "0 h" would say the column takes no time at all. No figure is the honest answer, and
        // it is what keeps the header from printing one.
        await GivenGameInAsync("Stardew Valley", "1", LogStatus.Backlog, estimate: null);

        var hours = (await ColumnAsync(LogStatus.Backlog)).Hours;

        hours.Length.ShouldBeNull();
        hours.LengthTitles.ShouldBe(0);
    }

    [Fact]
    public async Task The_backlog_total_leaves_out_what_is_on_the_release_calendar()
    {
        // The Backlog column answers without the titles that are not out yet, so its header has
        // to as well — the calendar under the board is where those are, and a header that added
        // them in would disagree with the cards right under it.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20m);
        var unreleased = await GivenGameInAsync(
            "Silksong II", "2", LogStatus.Backlog, estimate: 30m);
        await GivenReleaseDayAsync(unreleased, new DateOnly(2027, 3, 12));

        var column = await ColumnAsync(LogStatus.Backlog);

        column.Items.ShouldHaveSingleItem().Title.ShouldBe("Celeste");
        column.Hours.Length.ShouldBe(20m);
        column.Hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task The_completed_total_follows_the_year_and_8pm_on_new_years_eve_is_that_year()
    {
        // 8pm on the 31st here is already the 1st in UTC. A total that read the year off the
        // stored instant in the wrong zone would move this game into next year's header while
        // its card stayed in this one.
        await GivenGameInAsync(
            "Midnight Run", "1", LogStatus.Completed, estimate: 10m, hoursPlayed: 12m,
            completedAt: Eastern(2026, 12, 31, 20, 0));
        await GivenGameInAsync(
            "New Year", "2", LogStatus.Completed, estimate: 30m, hoursPlayed: 25m,
            completedAt: Eastern(2027, 1, 1));

        var thisYear = (await ColumnAsync(LogStatus.Completed, year: 2026)).Hours;
        thisYear.Length.ShouldBe(10m);
        thisYear.Played.ShouldBe(12m);

        var nextYear = (await ColumnAsync(LogStatus.Completed, year: 2027)).Hours;
        nextYear.Length.ShouldBe(30m);
        nextYear.Played.ShouldBe(25m);
    }

    [Fact]
    public async Task Completed_compares_your_hours_only_over_the_titles_that_have_both()
    {
        // A comparison over two different sets of titles is not one. A game with no hours logged
        // would put its estimate on one side and nothing on the other, and read as you having
        // been quick; a game with no estimate would do the opposite.
        await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 14.5m);
        await GivenGameInAsync(
            "Outer Wilds", "2", LogStatus.Completed, estimate: 17m, hoursPlayed: 21m);
        await GivenGameInAsync(
            "Hi-Fi Rush", "3", LogStatus.Completed, estimate: 13m, hoursPlayed: null);
        await GivenGameInAsync(
            "Untimed", "4", LogStatus.Completed, estimate: null, hoursPlayed: 5m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(35.5m);
        hours.PlayedLength.ShouldBe(37m);
        hours.PlayedTitles.ShouldBe(2);

        // The plain total is still every title with an estimate, hours logged or not.
        hours.Length.ShouldBe(50m);
        hours.LengthTitles.ShouldBe(3);
    }

    [Fact]
    public async Task With_no_hours_logged_there_is_nothing_to_compare()
    {
        await GivenGameInAsync("Celeste", "1", LogStatus.Completed, estimate: 20m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBeNull();
        hours.PlayedLength.ShouldBeNull();
        hours.PlayedTitles.ShouldBe(0);
    }

    [Fact]
    public async Task Your_hours_are_the_current_passes_like_everything_else_on_the_card()
    {
        // Finished twice: the column holds the title once, as its latest pass, and that pass is
        // the one whose hours count. Adding up every pass would be a different number — time
        // spent on a title across its replays — and it is not what the card beside it says.
        var celeste = await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 31m,
            completedAt: Eastern(2025, 3, 1));
        await PostPassAsync(
            Client, celeste, LogStatus.Completed,
            hoursPlayed: 9m, completedAt: Eastern(2026, 3, 1));

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(9m);
        hours.PlayedTitles.ShouldBe(1);
    }

    [Fact]
    public async Task Somebody_elses_hours_never_count()
    {
        // The title is shared and the passes are not. Two people finishing the same game is one
        // media row with two passes against it, and only yours is on your board.
        var celeste = await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 14.5m);

        var stranger = ClientFor(await GivenUserAsync("Somebody Else"));
        await PostPassAsync(stranger, celeste, LogStatus.Completed, hoursPlayed: 60m);

        var hades = await GivenGameWithEstimateAsync("Hades", "2", 42m);
        await PostPassAsync(stranger, hades, LogStatus.Completed, hoursPlayed: 50m);

        var hours = (await ColumnAsync(LogStatus.Completed)).Hours;

        hours.Played.ShouldBe(14.5m);
        hours.PlayedTitles.ShouldBe(1);
        hours.Length.ShouldBe(20m);
        hours.LengthTitles.ShouldBe(1);
    }

    [Fact]
    public async Task The_total_is_the_sum_of_what_the_cards_print_for_every_hobby()
    {
        // LengthHours is built in both of LibraryService's projections and ordered on in Sorted,
        // and the total is a fourth copy of that coalesce. This is what holds it to the cards: for
        // each hobby, the header's sum is the sum of the figures its cards print. Leave a hobby's
        // arm out of the total and its board has no total at all.
        //
        // The runtimes are chosen not to divide into hundredths of an hour. A card rounds its
        // figure to two places, so a total that skipped the rounding would drift from the cards
        // above it by a fraction of a minute a title — here, 116 minutes is a card's 1.93 h and
        // an unrounded 1.9333.
        await GivenGameInAsync("Celeste", "1", LogStatus.Backlog, estimate: 20.25m);
        await GivenGameInAsync("Hades", "2", LogStatus.Backlog, estimate: 41.82m);

        await GivenLogEntryAsync(await GivenMovieAsync("Arrival", "1", runtimeMinutes: 116));
        await GivenLogEntryAsync(await GivenMovieAsync("Heat", "2", runtimeMinutes: 170));

        await GivenLogEntryAsync(await GivenShowAsync(
            "Severance", "1", numberOfEpisodes: 19, episodeRuntimeMinutes: 47));
        await GivenLogEntryAsync(await GivenShowAsync(
            "Andor", "2", numberOfEpisodes: 24, episodeRuntimeMinutes: 49));

        await GivenLogEntryAsync(await GivenAnimeAsync(
            "Sousou no Frieren", "1", episodeCount: 28, episodeRuntimeSeconds: 1440));
        await GivenLogEntryAsync(await GivenAnimeAsync(
            "Mushishi", "2", episodeCount: 26, episodeRuntimeSeconds: 1430));

        foreach (var hobby in new[] { "games", "movies", "tv", "anime" })
        {
            var column = await ColumnAsync(LogStatus.Backlog, hobby: hobby);

            column.Items.Count.ShouldBe(2, hobby);
            column.Items.ShouldAllBe(item => item.LengthHours != null, hobby);
            column.Hours.Length.ShouldBe(column.Items.Sum(item => item.LengthHours!.Value), hobby);
            column.Hours.LengthTitles.ShouldBe(2, hobby);
        }
    }

    // ------------------------------------------------------- the titles a count leaves out

    [Fact]
    public async Task Each_list_is_the_titles_its_count_is_over_across_the_whole_column()
    {
        // The header prints two counts, the titles with no estimate and the timed ones without
        // your hours, and each opens a list. A list has to be exactly the titles its count is
        // over, and of the whole column: a column is paged at a hundred, so a list of the page it
        // was handed would name fewer titles than the count that opens it.
        await GivenGameInAsync(
            "Celeste", "1", LogStatus.Completed, estimate: 20m, hoursPlayed: 14.5m);
        await GivenGameInAsync("Hi-Fi Rush", "2", LogStatus.Completed, estimate: 13m);
        await GivenGameInAsync("Tunic", "3", LogStatus.Completed, estimate: 21.5m);
        await GivenGameInAsync(
            "Untimed", "4", LogStatus.Completed, estimate: null, hoursPlayed: 5m);
        await GivenGameInAsync("Unheard Of", "5", LogStatus.Completed, estimate: null);

        var column = await ColumnAsync(LogStatus.Completed, pageSize: 1);
        column.Items.Count.ShouldBe(1);
        var hours = column.Hours;

        // Hours logged or not: a title with no estimate is counted as that and nothing else, so
        // the two lists never name one title twice, as the two counts never count it twice.
        var withoutLength = hours.WithoutLength.ShouldNotBeNull();
        withoutLength.Select(title => title.Title).ShouldBe(["Untimed", "Unheard Of"], ignoreOrder: true);
        withoutLength.Count.ShouldBe(column.Total - hours.LengthTitles);

        var withoutPlayed = hours.WithoutPlayed.ShouldNotBeNull();
        withoutPlayed.Select(title => title.Title).ShouldBe(["Hi-Fi Rush", "Tunic"], ignoreOrder: true);
        withoutPlayed.Count.ShouldBe(hours.LengthTitles - hours.PlayedTitles);
    }

    [Fact]
    public async Task A_list_is_the_titles_of_the_year_the_column_shows()
    {
        // Completed follows the year and its header with it, so its lists do too. 8pm on New
        // Year's Eve here is already the 1st in UTC: a list that read the year in the wrong zone
        // would name that game under next year while its card stayed in this one.
        await GivenGameInAsync(
            "Midnight Run", "1", LogStatus.Completed, estimate: 10m,
            completedAt: Eastern(2025, 12, 31, 20, 0));
        await GivenGameInAsync(
            "New Year", "2", LogStatus.Completed, estimate: 30m,
            completedAt: Eastern(2026, 1, 1));
        await GivenGameInAsync(
            "Unheard Of", "3", LogStatus.Completed, estimate: null,
            completedAt: Eastern(2026, 6, 1));

        var lastYear = (await ColumnAsync(LogStatus.Completed, year: 2025)).Hours;
        lastYear.WithoutPlayed.ShouldNotBeNull().Select(title => title.Title).ShouldBe(["Midnight Run"]);
        lastYear.WithoutLength.ShouldNotBeNull().ShouldBeEmpty();

        var thisYear = (await ColumnAsync(LogStatus.Completed, year: 2026)).Hours;
        thisYear.WithoutPlayed.ShouldNotBeNull().Select(title => title.Title).ShouldBe(["New Year"]);
        thisYear.WithoutLength.ShouldNotBeNull().Select(title => title.Title).ShouldBe(["Unheard Of"]);
    }

    [Fact]
    public async Task The_backlog_list_leaves_out_what_is_on_the_release_calendar()
    {
        // Nobody has timed a game that is not out yet, so every title on the calendar has no
        // estimate. They are under the board rather than in the column, and a list that took
        // them in would name a dozen titles the column above it does not hold.
        await GivenGameInAsync("Stardew Valley", "1", LogStatus.Backlog, estimate: null);
        var unreleased = await GivenGameInAsync(
            "Silksong II", "2", LogStatus.Backlog, estimate: null);
        await GivenReleaseDayAsync(unreleased, new DateOnly(2027, 3, 12));

        var hours = (await ColumnAsync(LogStatus.Backlog)).Hours;

        hours.WithoutLength.ShouldNotBeNull().Select(title => title.Title).ShouldBe(["Stardew Valley"]);
    }

    [Fact]
    public async Task A_list_names_its_titles_in_the_order_the_column_shows_them()
    {
        // In the column's own order, whichever it is sorted by, so the list reads in the order of
        // the cards under it. Added Hades, Celeste, Tunic: by hand the newest is on top, and by
        // title it is alphabetical, which are two orders and neither is the order they were added.
        await GivenGameInAsync("Hades", "1", LogStatus.Backlog, estimate: null);
        await GivenGameInAsync("Celeste", "2", LogStatus.Backlog, estimate: null);
        await GivenGameInAsync("Tunic", "3", LogStatus.Backlog, estimate: null);

        foreach (var (sort, expected) in new[]
                 {
                     ("manual", new[] { "Tunic", "Celeste", "Hades" }),
                     ("title", new[] { "Celeste", "Hades", "Tunic" }),
                 })
        {
            var column = await ColumnAsync(LogStatus.Backlog, sort: sort);

            column.Items.Select(item => item.Title).ShouldBe(expected, sort);
            column.Hours.WithoutLength.ShouldNotBeNull(sort)
                .Select(title => title.Title).ShouldBe(expected, sort);
        }
    }

    [Fact]
    public async Task A_title_in_a_list_is_named_and_covered_as_its_card_is_for_every_hobby()
    {
        // The name in a list is one more copy of the coalesce a card leads with: MAL's English
        // title for an anime where there is one, and the one name there is for everything else.
        // This holds the copy to the cards, as the total's test holds the sum's. No title here
        // has a length, so each is in its column's list beside its own card.
        var stardew = await GivenGameAsync(
            "Stardew Valley", "1", coverUrl: "https://images.igdb.com/stardew.jpg");
        await PostPassAsync(Client, stardew, LogStatus.Backlog);
        await GivenLogEntryAsync(await GivenMovieAsync(
            "Arrival", "1", coverUrl: "https://image.tmdb.org/arrival.jpg"));
        await GivenLogEntryAsync(await GivenShowAsync(
            "Severance", "1", coverUrl: "https://image.tmdb.org/severance.jpg"));
        await GivenLogEntryAsync(await GivenAnimeAsync(
            "Sousou no Frieren", "1", englishTitle: "Frieren: Beyond Journey's End",
            coverUrl: "https://cdn.myanimelist.net/frieren.jpg"));

        foreach (var hobby in new[] { "games", "movies", "tv", "anime" })
        {
            var column = await ColumnAsync(LogStatus.Backlog, hobby: hobby);
            var card = column.Items.ShouldHaveSingleItem(hobby);
            var listed = column.Hours.WithoutLength.ShouldNotBeNull(hobby).ShouldHaveSingleItem(hobby);

            listed.MediaId.ShouldBe(card.MediaId, hobby);
            listed.Title.ShouldBe(card.Title, hobby);
            listed.CoverUrl.ShouldNotBeNull(hobby);
            listed.CoverUrl.ShouldBe(card.CoverUrl, hobby);
        }

        // And the anime by the name its card leads with, which is not the one in media.title.
        (await ColumnAsync(LogStatus.Backlog, hobby: "anime")).Hours.WithoutLength
            .ShouldNotBeNull().ShouldHaveSingleItem().Title.ShouldBe("Frieren: Beyond Journey's End");
    }

    // ----------------------------------------------------------------- helpers

    /// <summary>
    /// A game with HowLongToBeat's All Styles figure already on it, and a pass of yours through the
    /// API — so the pass is written exactly as the app writes one.
    /// </summary>
    private async Task<int> GivenGameInAsync(
        string title,
        string externalId,
        LogStatus status,
        decimal? estimate,
        decimal? hoursPlayed = null,
        DateTimeOffset? completedAt = null)
    {
        var mediaId = await GivenGameWithEstimateAsync(title, externalId, estimate);
        await PostPassAsync(Client, mediaId, status, hoursPlayed, completedAt);
        return mediaId;
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

    private async Task PostPassAsync(
        HttpClient client,
        int mediaId,
        LogStatus status,
        decimal? hoursPlayed = null,
        DateTimeOffset? completedAt = null)
    {
        var response = await client.PostAsJsonAsync(
            "/api/log-entries",
            new CreateLogEntryRequest(mediaId, status, null, null, null, completedAt, hoursPlayed),
            Json,
            Ct);

        response.EnsureSuccessStatusCode();
    }

    /// <summary>
    /// Announces a day it comes out on, after the clock's today, so the title is on the calendar
    /// rather than in the column. Built through <see cref="ReleaseWindow.For"/>, as
    /// ComingSoonTests builds its windows, so the check constraint is never in question.
    /// </summary>
    private Task GivenReleaseDayAsync(int mediaId, DateOnly day) => WithDbAsync(async db =>
    {
        var window = ReleaseWindow.For(day, ReleasePrecision.Day);

        var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
        media.ReleaseDate = window.Start;
        media.ReleaseEnd = window.End;
        media.ReleasePrecision = window.Precision;

        await db.SaveChangesAsync(Ct);
    });

    private async Task<LibraryPage> ColumnAsync(
        LogStatus status,
        string hobby = "games",
        int? year = null,
        int? pageSize = null,
        string? sort = null)
    {
        var url = $"/api/library?hobby={hobby}&status={status}";
        if (year is { } wanted) url += $"&year={wanted}";
        if (pageSize is { } size) url += $"&pageSize={size}";
        if (sort is { } order) url += $"&sort={order}";

        return await ReadAsync<LibraryPage>(await Client.GetAsync(url, Ct));
    }
}
