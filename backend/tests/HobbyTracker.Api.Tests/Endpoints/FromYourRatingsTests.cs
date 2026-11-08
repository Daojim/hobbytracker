using System.Globalization;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Discover's fifth list, From your ratings: what IGDB calls like the games you finished and rated
/// 8 or more, less what is on your board. Workshopped on 7 November 2026 against the user's real
/// ratings; see #17 in docs/plans/games-board-next.md.
///
/// <para>
/// <b>The first Discover list that reads your board</b>, so it is the first that can hand one
/// person's answer to another. The four lists are the same for everybody and cached as such;
/// this one is cached by the questions it asks IGDB — the board's ids, then the ids those name —
/// so no key names a person and none needs to.
/// </para>
///
/// <para>
/// A seed is a title whose <b>latest finished pass</b> is rated 8 or more: finished meaning in
/// Completed, as the Stats page counts a finish, and latest by <c>logged_at DESC, id DESC</c>,
/// the order every other place decides a title's passes by.
/// </para>
///
/// The stopped clock reads 15 September 2026.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class FromYourRatingsTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    private const string Route = "/api/games/discover/from-your-ratings";

    [Fact]
    public async Task Offers_what_igdb_calls_like_a_game_you_finished_and_rated_highly()
    {
        IgdbKnows(
            Known(1, "Dead Cells", ratings: 900),
            Known(2, "Blasphemous", ratings: 300));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [2, 1]);

        var page = await RatingsAsync();

        page.Titles.Select(title => title.Title).ShouldBe(["Dead Cells", "Blasphemous"]);
        page.Seeds.ShouldBe(1);
        page.Next.ShouldBeNull();

        // What the tile says: Because you rated Hollow Knight 9.
        page.Because.ShouldNotBeNull()[page.Titles[0].Id].ShouldBe([new RatedTitle("Hollow Knight", 9m)]);
    }

    [Fact]
    public async Task A_tile_carries_the_media_id_a_log_entry_points_at()
    {
        IgdbKnows(Known(1, "Dead Cells"));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);

        var tile = (await RatingsAsync()).Titles.ShouldHaveSingleItem();

        // Upserted exactly as the other four lists and a search are, so adding from it is the same
        // request as adding from them.
        var added = await Client.PostAsJsonAsync(
            "/api/log-entries", new { mediaId = tile.Id, status = "Backlog" }, Ct);

        added.StatusCode.ShouldBe(HttpStatusCode.Created);
    }

    // ----------------------------------------------------------------------------- yours alone

    [Fact]
    public async Task Seeds_are_yours_alone()
    {
        var other = await GivenUserAsync("Somebody Else");
        IgdbKnows(
            Known(1, "Dead Cells"),
            Known(2, "Gris"));

        // Hollow Knight is on both boards, and finished on both. Yours is unrated and theirs is a
        // 10, logged after yours — so a rating read across everybody's passes would find theirs
        // latest, and make it your seed.
        var hollow = await GivenIgdbGameAsync(14593, "Hollow Knight", similar: [1]);
        await GivenLogEntryAsync(hollow, LogStatus.Completed, completedAt: Eastern(2026, 9, 1));
        Clock.UtcNow = Clock.UtcNow.AddDays(1);
        await GivenLogEntryAsync(hollow, LogStatus.Completed, rating: 10m, completedAt: Eastern(2026, 9, 2), userId: other);

        // And a 10 of theirs on a title that is not on your board at all.
        var celeste = await GivenIgdbGameAsync(17000, "Celeste", similar: [2]);
        await GivenLogEntryAsync(celeste, LogStatus.Completed, rating: 10m, completedAt: Eastern(2026, 9, 2), userId: other);

        var page = await RatingsAsync();

        page.Titles.ShouldBeEmpty();
        page.Seeds.ShouldBe(0);
        Igdb.SimilarLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Somebody_elses_board_leaves_nothing_out_of_yours()
    {
        var other = await GivenUserAsync("Somebody Else");
        IgdbKnows(Known(1, "Dead Cells"));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);

        // On their board, and not on yours: the board this list leaves out is the one it is for.
        var deadCells = await GivenIgdbGameAsync(1, "Dead Cells");
        await GivenLogEntryAsync(deadCells, LogStatus.Backlog, userId: other);

        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Dead Cells"]);
    }

    [Fact]
    public async Task Two_users_with_different_seeds_get_different_lists_on_the_same_day()
    {
        var other = await GivenUserAsync("Somebody Else");
        IgdbKnows(
            Known(1, "Dead Cells"),
            Known(2, "Gris"));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);
        await OnBoardAsync(17000, "Celeste", LogStatus.Completed, rating: 9m, similar: [2], userId: other);

        // One host, one cache, one day: what the four lists share between everybody is exactly
        // what this one must not. Kept under the list and the day, the second person would be
        // handed the first one's suggestions.
        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Dead Cells"]);
        (await RatingsAsync(ClientFor(other))).Titles.Select(title => title.Title).ShouldBe(["Gris"]);
    }

    // --------------------------------------------------------------------------------- the board

    [Fact]
    public async Task Nothing_on_your_board_is_offered_from_any_column()
    {
        IgdbKnows(
            Known(1, "One"),
            Known(2, "Two"),
            Known(3, "Three"),
            Known(4, "Four"),
            Known(5, "Five"),
            Known(6, "Six"));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1, 2, 3, 4, 5, 6]);

        await OnBoardAsync(1, "One", LogStatus.Backlog);
        await OnBoardAsync(2, "Two", LogStatus.InProgress);
        await OnBoardAsync(3, "Three", LogStatus.OnHold);
        await OnBoardAsync(4, "Four", LogStatus.Completed);

        // Dropped included. You have decided about it, which is the last thing a list of
        // suggestions should ask you to decide about again.
        await OnBoardAsync(5, "Five", LogStatus.Dropped);

        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Six"]);
    }

    [Theory]
    [InlineData(LogStatus.Backlog)]
    [InlineData(LogStatus.InProgress)]
    [InlineData(LogStatus.OnHold)]
    [InlineData(LogStatus.Completed)]
    [InlineData(LogStatus.Dropped)]
    public async Task A_board_titles_original_is_never_offered_from_any_column(LogStatus status)
    {
        // Persona 3 Reload is a remake, filed by IGDB under an id of its own and naming Persona 3
        // as its parent_game. Somebody with Reload on their board has Persona 3 already, under
        // another number. Ten of those were offered on the user's real list until this rule.
        var original = Known(100, "Persona 3", ratings: 500, similar: [7]);
        IgdbKnows(
            original,
            Known(300, "Persona 3 Reload", parent: original),
            Known(7, "Persona 3 Portable", ratings: 400));

        await OnBoardAsync(300, "Persona 3 Reload", status);
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [100, 7]);

        // Portable is a port of the same game by any reading of its name, and IGDB links it to
        // nothing on this board — so it is offered. A name is not a link, and guessing at one
        // would take games off a list nobody asked to lose.
        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Persona 3 Portable"]);
    }

    [Fact]
    public async Task Asks_igdb_no_second_question_when_your_seeds_name_nothing_you_do_not_have()
    {
        IgdbKnows(Known(1, "Dead Cells"));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);
        await OnBoardAsync(1, "Dead Cells", LogStatus.Backlog);

        var page = await RatingsAsync();

        page.Titles.ShouldBeEmpty();

        // Seeds there are, so this is the page's own empty line and not the one about rating.
        page.Seeds.ShouldBe(1);

        // `where id = ()` is an APIcalypse syntax error, and there is nothing to ask about anyway.
        Igdb.DiscoverableLookups.ShouldBeEmpty();
    }

    // --------------------------------------------------------------------------------- the seeds

    [Fact]
    public async Task With_nothing_finished_and_rated_8_or_more_the_list_says_so_and_asks_igdb_nothing()
    {
        // Rated and not finished, in two ways: playing still, and dropped — which can carry a
        // finish date, since dropping leaves a completion alone, and is still not a finish.
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.InProgress, rating: 9m, similar: [1]);
        await OnBoardAsync(17000, "Celeste", LogStatus.Dropped, rating: 10m, similar: [2], completedAt: Eastern(2026, 8, 1));

        // Finished and not rated, and finished and rated under 8.
        await OnBoardAsync(1113, "Hades", LogStatus.Completed, similar: [3]);
        await OnBoardAsync(17001, "Stardew Valley", LogStatus.Completed, rating: 7.5m, similar: [4]);

        var page = await RatingsAsync();

        page.Titles.ShouldBeEmpty();
        page.Next.ShouldBeNull();
        page.Seeds.ShouldBe(0);
        page.Because.ShouldNotBeNull().ShouldBeEmpty();

        Igdb.SimilarLookups.ShouldBeEmpty();
        Igdb.DiscoverableLookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Seeds_start_at_8()
    {
        IgdbKnows(
            Known(1, "One"),
            Known(2, "Two"));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 7.5m, similar: [1]);
        await OnBoardAsync(17000, "Celeste", LogStatus.Completed, rating: 8m, similar: [2]);

        var page = await RatingsAsync();

        page.Titles.Select(title => title.Title).ShouldBe(["Two"]);
        page.Seeds.ShouldBe(1);
    }

    [Fact]
    public async Task A_title_seeds_by_its_latest_finish()
    {
        IgdbKnows(
            Known(1, "Like Hollow Knight"),
            Known(2, "Like Celeste"));

        var hollow = await GivenIgdbGameAsync(14593, "Hollow Knight", similar: [1]);
        var celeste = await GivenIgdbGameAsync(17000, "Celeste", similar: [2]);

        // Each replay written down before the finish it followed, so the ids run the opposite way
        // to the time: what decides which finish is latest has to be logged_at, as it is on the
        // board, and not whichever row happened to be inserted last.
        Clock.UtcNow = Eastern(2026, 9, 10);
        await GivenLogEntryAsync(hollow, LogStatus.Completed, rating: 6m, completedAt: Eastern(2026, 9, 9));
        await GivenLogEntryAsync(celeste, LogStatus.Completed, rating: 9m, completedAt: Eastern(2026, 9, 9));

        Clock.UtcNow = Eastern(2026, 3, 2);
        await GivenLogEntryAsync(hollow, LogStatus.Completed, rating: 8m, completedAt: Eastern(2026, 3, 1));
        await GivenLogEntryAsync(celeste, LogStatus.Completed, rating: 6m, completedAt: Eastern(2026, 3, 1));

        // An 8 replayed as a 6 seeds nothing, and a 6 replayed as a 9 seeds. Your latest word on
        // a game is the one that counts, whatever you thought of it the first time.
        var page = await RatingsAsync();

        page.Titles.Select(title => title.Title).ShouldBe(["Like Celeste"]);
        page.Because.ShouldNotBeNull()[page.Titles[0].Id].ShouldBe([new RatedTitle("Celeste", 9m)]);
    }

    // ------------------------------------------------------------------------------ the order

    [Fact]
    public async Task Ranks_games_by_how_many_of_your_seeds_point_at_them_and_then_by_how_many_people_rated_them()
    {
        IgdbKnows(
            Known(1, "One", ratings: 900),
            Known(2, "Two", ratings: 100),
            Known(3, "Three", ratings: 50),
            Known(4, "Four", ratings: 800));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1, 2, 3]);
        await OnBoardAsync(17000, "Celeste", LogStatus.Completed, rating: 9m, similar: [2, 3]);
        await OnBoardAsync(1113, "Hades", LogStatus.Completed, rating: 9m, similar: [3, 4]);

        // Three is named by all three seeds and Two by two, so each goes ahead of games far more
        // people have rated. Few games are named twice — 205 of 262 on the user's list were named
        // by one seed — so it is mostly the second key that orders the list.
        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Three", "Two", "One", "Four"]);
    }

    [Fact]
    public async Task Each_title_carries_the_seeds_behind_it_highest_rated_first()
    {
        IgdbKnows(
            Known(1, "One", ratings: 900),
            Known(2, "Two", ratings: 100));

        await OnBoardAsync(17000, "Celeste", LogStatus.Completed, rating: 8m, similar: [1]);
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9.5m, similar: [1]);
        await OnBoardAsync(1113, "Hades", LogStatus.Completed, rating: 9.5m, similar: [1, 2]);

        var page = await RatingsAsync();
        var because = page.Because.ShouldNotBeNull();

        // Ties by name, so the one a tile names never depends on which was logged first.
        because[page.Titles[0].Id].ShouldBe(
        [
            new RatedTitle("Hades", 9.5m),
            new RatedTitle("Hollow Knight", 9.5m),
            new RatedTitle("Celeste", 8m),
        ]);
        because[page.Titles[1].Id].ShouldBe([new RatedTitle("Hades", 9.5m)]);
    }

    [Theory]
    [InlineData("new-releases")]
    [InlineData("popular-now")]
    [InlineData("most-anticipated")]
    [InlineData("most-played")]
    public async Task The_other_four_lists_send_no_seeds_and_no_reasons(string list)
    {
        // A board with a seed on it, so a list that read it by mistake would have something to say.
        IgdbKnows(Known(1, "Dead Cells"));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);

        var response = await Client.GetAsync($"/api/games/discover/{list}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        var page = await ReadAsync<DiscoverListPage<GameDto>>(response);
        page.Seeds.ShouldBeNull();
        page.Because.ShouldBeNull();
        Igdb.SimilarLookups.ShouldBeEmpty();
    }

    // ------------------------------------------------------------------------- versions and floor

    [Fact]
    public async Task A_version_brings_its_originals_similar_games_and_not_its_own()
    {
        // The Thousand-Year Door's remake, as IGDB has it: its own ten were mostly online and
        // mobile games — Black Clover Mobile among them — and none with fifty ratings, where the
        // 2004 original's ten held ten. A version's own list is usually the worse of the two.
        var original = Known(100, "Paper Mario: The Thousand-Year Door (2004)", ratings: 600, similar: [1, 2]);
        IgdbKnows(
            original,
            Known(1, "Mario & Luigi: Superstar Saga", ratings: 300),
            Known(2, "Super Paper Mario", ratings: 200),
            Known(9001, "Black Clover Mobile", ratings: 40));

        await OnBoardAsync(
            250000, "Paper Mario: The Thousand-Year Door", LogStatus.Completed, rating: 9m, similar: [9001], parent: original);

        var page = await RatingsAsync();

        page.Titles.Select(title => title.Title).ShouldBe(["Mario & Luigi: Superstar Saga", "Super Paper Mario"]);

        // Still yours by name: the tile says what you rated, not what IGDB filed it under.
        page.Because.ShouldNotBeNull()[page.Titles[0].Id]
            .ShouldBe([new RatedTitle("Paper Mario: The Thousand-Year Door", 9m)]);
    }

    [Fact]
    public async Task Nothing_with_fewer_than_ten_ratings_is_offered()
    {
        IgdbKnows(
            Known(1, "Ten", ratings: 10),
            Known(2, "Nine", ratings: 9),
            FakeIgdbClient.Game(3, "None"));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1, 2, 3]);

        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Ten"]);

        // The user would not rest the list on IGDB's scores, so the floor is on how many people
        // rated a game — whether it is known — and asked of IGDB, before its limit.
        Igdb.DiscoverableLookups.ShouldHaveSingleItem().FewestRatings.ShouldBe(10);
    }

    // ----------------------------------------------------------------------------- the cache

    [Fact]
    public async Task A_new_rating_changes_the_list_without_waiting_for_the_cache_to_expire()
    {
        IgdbKnows(
            Known(1, "One", ratings: 100),
            Known(2, "Two", ratings: 200));

        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);
        var (_, celeste) = await OnBoardAsync(17000, "Celeste", LogStatus.Completed, similar: [2]);

        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["One"]);

        var rated = await Client.PutAsJsonAsync(
            $"/api/log-entries/{celeste}",
            new { status = "Completed", rating = 9m, completedAt = Eastern(2026, 9, 1) },
            Ct);
        rated.StatusCode.ShouldBe(HttpStatusCode.OK);

        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Two", "One"]);

        // The board's titles did not change, so what IGDB said about them came out of the cache
        // and only the games the new seed names were asked about.
        Igdb.SimilarLookups.Count.ShouldBe(1);
    }

    [Fact]
    public async Task Asks_igdb_once_for_a_board_however_often_and_however_far_down_it_is_read()
    {
        IgdbKnows([.. Enumerable.Range(1, 60).Select(id => Known(id, $"Game {id}", ratings: 1000 - id))]);
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [.. Enumerable.Range(1, 60)]);

        var first = await RatingsAsync();
        first.Titles.Count.ShouldBe(48);
        first.Next.ShouldBe(48);

        var second = await RatingsAsync(from: first.Next);
        second.Titles.Select(title => title.Title).ShouldBe(
            [.. Enumerable.Range(49, 12).Select(id => $"Game {id}")]);
        second.Next.ShouldBeNull();

        await RatingsAsync();

        Igdb.SimilarLookups.Count.ShouldBe(1);
        Igdb.DiscoverableLookups.Count.ShouldBe(1);
    }

    [Fact]
    public async Task A_cached_list_still_hands_out_media_ids_that_exist()
    {
        IgdbKnows(Known(1, "Dead Cells"));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);
        await RatingsAsync();

        // What the end-to-end suite does between specs while the API lives on: every row gone and
        // the sequence restarted. The board goes with them, so it is put back as it was — and its
        // title takes the first id, which is the one Dead Cells had.
        await WithDbAsync(db => db.Database.ExecuteSqlRawAsync(
            "TRUNCATE media RESTART IDENTITY CASCADE;", Ct));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);

        var tile = (await RatingsAsync()).Titles.ShouldHaveSingleItem();

        Igdb.SimilarLookups.Count.ShouldBe(1);
        Igdb.DiscoverableLookups.Count.ShouldBe(1);
        (await WithDbAsync(db => db.Media.SingleAsync(media => media.Id == tile.Id, Ct)))
            .Title.ShouldBe("Dead Cells");
    }

    [Fact]
    public async Task Asks_about_a_board_and_what_it_names_500_at_a_time()
    {
        // IGDB caps an answer at 500, so a question about more is a question half answered.
        // 501 titles, 51 of them finished and rated, each naming ten games of its own.
        IgdbKnows(
        [
            .. Enumerable.Range(1, 501).Select(id => Known(
                id, $"Board {id}", similar: id <= 51 ? [.. Enumerable.Range(10_000 + id * 10, 10)] : null)),
            .. Enumerable.Range(1, 51).SelectMany(id => Enumerable.Range(10_000 + id * 10, 10))
                .Select(id => Known(id, $"Named {id}")),
        ]);

        await WithDbAsync(async db =>
        {
            foreach (var id in Enumerable.Range(1, 501))
            {
                db.LogEntries.Add(new LogEntry
                {
                    UserId = UserId,
                    Status = id <= 51 ? LogStatus.Completed : LogStatus.Backlog,
                    Rating = id <= 51 ? 9m : null,
                    CompletedAt = id <= 51 ? Eastern(2026, 9, 1) : null,
                    LoggedAt = Clock.UtcNow,
                    Media = new Game
                    {
                        HobbyId = SeedData.Hobbies.Games,
                        SourceId = SeedData.Sources.Igdb,
                        ExternalId = id.ToString(CultureInfo.InvariantCulture),
                        Title = $"Board {id}",
                    },
                });
            }

            await db.SaveChangesAsync(Ct);
        });

        await RatingsAsync();

        Igdb.SimilarLookups.Select(ids => ids.Length).ShouldBe([500, 1]);
        Igdb.DiscoverableLookups.Select(lookup => lookup.Ids.Length).ShouldBe([500, 10]);
    }

    [Fact]
    public async Task Reports_igdb_failure_as_502_and_does_not_remember_it()
    {
        IgdbKnows(Known(1, "Dead Cells"));
        await OnBoardAsync(14593, "Hollow Knight", LogStatus.Completed, rating: 9m, similar: [1]);

        Igdb.ThrowOnNextCall = new IgdbException("IGDB did not respond within the configured timeout.");
        (await Client.GetAsync(Route, Ct)).StatusCode.ShouldBe(HttpStatusCode.BadGateway);

        // Otherwise a bad afternoon at IGDB is an empty list until the cache lets go of it.
        (await RatingsAsync()).Titles.Select(title => title.Title).ShouldBe(["Dead Cells"]);
    }

    // ------------------------------------------------------------------------------- arranging

    /// <summary>A game IGDB can be asked about, which enough people have rated to be offered.</summary>
    private static IgdbGame Known(
        int id, string name, int? ratings = 100, int[]? similar = null, IgdbGame? parent = null) =>
        FakeIgdbClient.Game(id, name, similarGames: similar, parentGame: parent, ratings: ratings);

    private void IgdbKnows(params IgdbGame[] games)
    {
        foreach (var game in games)
        {
            Igdb.ById[game.Id] = game;
        }
    }

    /// <summary>
    /// A game in the catalogue under its IGDB id, as a search would have stored it — and, with
    /// <paramref name="similar"/> or <paramref name="parent"/>, what IGDB says about it. Kept unless
    /// a test already said otherwise about that id.
    /// </summary>
    private async Task<int> GivenIgdbGameAsync(
        int igdbId, string title, int[]? similar = null, IgdbGame? parent = null)
    {
        if (similar is not null || parent is not null || !Igdb.ById.ContainsKey(igdbId))
        {
            Igdb.ById[igdbId] = Known(igdbId, title, similar: similar, parent: parent);
        }

        return await GivenGameAsync(title, externalId: igdbId.ToString(CultureInfo.InvariantCulture));
    }

    /// <summary>A title on a board with one pass, dated as a pass in its column would be.</summary>
    private async Task<(int MediaId, int EntryId)> OnBoardAsync(
        int igdbId,
        string title,
        LogStatus status,
        decimal? rating = null,
        int[]? similar = null,
        IgdbGame? parent = null,
        DateTimeOffset? completedAt = null,
        int? userId = null)
    {
        var mediaId = await GivenIgdbGameAsync(igdbId, title, similar, parent);

        var entryId = await GivenLogEntryAsync(
            mediaId,
            status,
            rating: rating,
            completedAt: completedAt ?? (status == LogStatus.Completed ? Eastern(2026, 9, 1) : null),
            userId: userId);

        return (mediaId, entryId);
    }

    private async Task<DiscoverListPage<GameDto>> RatingsAsync(HttpClient? client = null, int? from = null)
    {
        var response = await (client ?? Client).GetAsync(from is null ? Route : $"{Route}?from={from}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync<DiscoverListPage<GameDto>>(response);
    }
}
