using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Hiding a game from Discover (#23): that one IGDB entry, never its series or its versions, kept
/// per account and left out of all five lists, and never out of a search. Workshopped on 13
/// November 2026 over the user's own list; see #23 in docs/plans/games-board-next.md.
///
/// <para>
/// <b>A hide goes after the shared cache, never into the question.</b> Four of the lists keep
/// IGDB's answer under the list, the day and the place, for everybody, so a hide in the question
/// or in the key would hand one person's hides to the next — the cache trap in CLAUDE.md's
/// <b>What fails silently</b>. From your ratings leaves a hide out of its ranked list before it is
/// paged, so no question to IGDB changes there either, and no page comes up short.
/// </para>
///
/// <para>
/// A hide is kept by media id, which is what a tile carries, and applied by IGDB id, which is what
/// a list holds before anything is stored: the one is reached from the other through
/// <c>media.external_id</c>.
/// </para>
///
/// The stopped clock reads 15 September 2026.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class DiscoverHideTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    private const string HiddenRoute = "/api/games/discover/hidden";

    // ------------------------------------------------------------------- off every list

    [Theory]
    [InlineData("new-releases")]
    [InlineData("popular-now")]
    [InlineData("most-anticipated")]
    [InlineData("most-played")]
    public async Task A_hidden_game_is_left_off_a_list_that_is_the_same_for_everybody(string list)
    {
        OnList(
            list,
            Offered(list, 1, "Tunic II"),
            Offered(list, 2, "Horizon Zero Dawn"),
            Offered(list, 3, "Blue Prince"));

        var horizon = (await TitlesAsync(list)).Single(title => title.Title == "Horizon Zero Dawn");

        await HideAsync(horizon.Id);

        // Left out of the answer the list already holds for today, rather than asked of IGDB again.
        (await TitlesAsync(list)).Select(title => title.Title).ShouldBe(["Tunic II", "Blue Prince"]);
        Igdb.DiscoverCalls.Count.ShouldBe(1);
    }

    [Fact]
    public async Task From_your_ratings_leaves_a_hidden_game_out_and_asks_igdb_nothing_new()
    {
        IgdbKnows(Known(1, "Dead Cells"), Known(2, "Horizon Zero Dawn"));
        await RatedNineAsync(similar: [2, 1]);

        var horizon = (await TitlesAsync("from-your-ratings")).Single(title => title.Title == "Horizon Zero Dawn");

        await HideAsync(horizon.Id);

        (await TitlesAsync("from-your-ratings")).Select(title => title.Title).ShouldBe(["Dead Cells"]);

        // Left out of what IGDB already said, so neither question changes. Left out of what is
        // asked instead, every hide and every Undo would be a question of its own.
        Igdb.SimilarLookups.Count.ShouldBe(1);
        Igdb.DiscoverableLookups.Count.ShouldBe(1);
    }

    [Fact]
    public async Task A_page_of_from_your_ratings_with_a_hide_on_it_still_holds_48()
    {
        IgdbKnows([.. Enumerable.Range(1, 60).Select(id => Known(id, $"Game {id}", ratings: 1000 - id))]);
        await RatedNineAsync(similar: [.. Enumerable.Range(1, 60)]);

        var before = await PageAsync("from-your-ratings");
        await HideAsync(before.Titles.Single(title => title.Title == "Game 5").Id);
        await HideAsync(before.Titles.Single(title => title.Title == "Game 21").Id);

        // Left out of the whole ranked list before it is cut into pages, so the page reaches two
        // titles further to fill itself and the next starts where it stopped.
        var first = await PageAsync("from-your-ratings");
        first.Titles.Select(title => title.Title).ShouldBe(
        [
            .. Enumerable.Range(1, 50)
                .Where(id => id is not (5 or 21))
                .Select(id => $"Game {id}"),
        ]);
        first.Next.ShouldBe(48);

        var second = await PageAsync("from-your-ratings", from: 48);
        second.Titles.Select(title => title.Title).ShouldBe(
            [.. Enumerable.Range(51, 10).Select(id => $"Game {id}")]);
        second.Next.ShouldBeNull();
    }

    [Theory]
    [InlineData("new-releases")]
    [InlineData("popular-now")]
    [InlineData("most-anticipated")]
    [InlineData("most-played")]
    public async Task A_page_with_hides_on_it_still_holds_48(string list)
    {
        OnList(list, [.. Enumerable.Range(1, 100).Select(id => Offered(list, id, $"Game {id}"))]);

        var before = await PageAsync(list);
        await HideAsync(before.Titles.Single(title => title.Title == "Game 5").Id);
        await HideAsync(before.Titles.Single(title => title.Title == "Game 21").Id);

        // Applied where the list's own rules are, while the page is being filled, rather than to
        // the page once it is cut — which would leave it two short.
        var page = await PageAsync(list);
        page.Titles.Count.ShouldBe(48);
        page.Titles.Select(title => title.Title).ShouldNotContain("Game 5");
        page.Titles.Select(title => title.Title).ShouldNotContain("Game 21");

        // The 48th title kept stands at place 49, so the next page starts at the place after it.
        page.Next.ShouldBe(50);
    }

    // --------------------------------------------------------- never in what is shared

    [Theory]
    [InlineData("new-releases")]
    [InlineData("popular-now")]
    [InlineData("most-anticipated")]
    [InlineData("most-played")]
    public async Task A_hide_never_reaches_the_answer_everybody_shares(string list)
    {
        var other = await GivenUserAsync("Somebody Else");
        OnList(list, Offered(list, 1, "Tunic II"), Offered(list, 2, "Horizon Zero Dawn"));

        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "2");
        await HideAsync(horizon);

        // Yours is asked for first, so a hide that went into IGDB's question, or into what is kept
        // of its answer, would be what everybody else is handed for the rest of the day.
        (await TitlesAsync(list)).Select(title => title.Title).ShouldBe(["Tunic II"]);
        (await TitlesAsync(list, ClientFor(other))).Select(title => title.Title)
            .ShouldBe(["Tunic II", "Horizon Zero Dawn"]);

        // And one question for the two of you: no key names a person, or what they hid.
        Igdb.DiscoverCalls.Count.ShouldBe(1);
    }

    [Fact]
    public async Task Somebody_elses_hide_leaves_your_list_from_your_ratings_alone()
    {
        var other = await GivenUserAsync("Somebody Else");
        IgdbKnows(Known(1, "Dead Cells"), Known(2, "Horizon Zero Dawn"));
        await RatedNineAsync(similar: [1, 2]);

        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "2");
        await HideAsync(horizon, ClientFor(other));

        (await TitlesAsync("from-your-ratings")).Select(title => title.Title)
            .ShouldBe(["Dead Cells", "Horizon Zero Dawn"]);
    }

    // ------------------------------------------------------------- and nowhere else

    [Fact]
    public async Task A_search_still_finds_a_hidden_game()
    {
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156");
        await HideAsync(horizon);

        Igdb.SetResults("horizon zero dawn", FakeIgdbClient.Game(11156, "Horizon Zero Dawn"));

        // Somebody who typed a title asked for it, which is the Discover filter's own reason for
        // leaving search alone.
        var response = await Client.GetAsync("/api/games?search=horizon zero dawn", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<List<GameDto>>(response)).Select(game => game.Title).ShouldBe(["Horizon Zero Dawn"]);
    }

    [Fact]
    public async Task Hiding_a_game_leaves_its_versions_on_the_list()
    {
        var original = FakeIgdbClient.Game(1, "The Last of Us");
        Igdb.MostRated =
        [
            original,
            FakeIgdbClient.Game(2, "The Last of Us Remastered", parentGame: original),
        ];

        var titles = await TitlesAsync("most-played");
        await HideAsync(titles.Single(title => title.Title == "The Last of Us").Id);

        // That entry and no other, the user's pick over every version by parent_game.
        (await TitlesAsync("most-played")).Select(title => title.Title).ShouldBe(["The Last of Us Remastered"]);
    }

    // ------------------------------------------------------------------- the list

    [Fact]
    public async Task The_hidden_list_is_newest_first_with_a_cover_and_a_name()
    {
        const string cover = "https://images.igdb.com/igdb/image/upload/t_cover_big/co2lbd.jpg";

        // Hidden in an order that is neither the order they were stored in nor their names', so
        // only when each was hidden can put them this way round.
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156", coverUrl: cover);
        var forza = await GivenGameAsync("Forza Horizon 5", externalId: "203722");
        var shadows = await GivenGameAsync("Assassin's Creed Shadows", externalId: "136879");

        await HideAsync(forza);
        Clock.UtcNow = Clock.UtcNow.AddMinutes(1);
        await HideAsync(shadows);
        Clock.UtcNow = Clock.UtcNow.AddMinutes(1);
        await HideAsync(horizon);

        (await HiddenAsync()).ShouldBe(
        [
            new HiddenTitleDto(horizon, "Horizon Zero Dawn", cover),
            new HiddenTitleDto(shadows, "Assassin's Creed Shadows", null),
            new HiddenTitleDto(forza, "Forza Horizon 5", null),
        ]);
    }

    [Fact]
    public async Task Nothing_hidden_is_an_empty_list()
    {
        (await HiddenAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Your_hidden_list_holds_your_hides_alone()
    {
        var other = await GivenUserAsync("Somebody Else");
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156");
        var forza = await GivenGameAsync("Forza Horizon 5", externalId: "203722");

        await HideAsync(horizon);
        await HideAsync(forza, ClientFor(other));

        (await HiddenAsync()).Select(title => title.MediaId).ShouldBe([horizon]);
    }

    // ----------------------------------------------------------------- hiding

    [Fact]
    public async Task Hiding_a_game_twice_is_one_hide_that_keeps_its_place()
    {
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156");
        var forza = await GivenGameAsync("Forza Horizon 5", externalId: "203722");

        await HideAsync(horizon);
        Clock.UtcNow = Clock.UtcNow.AddMinutes(1);
        await HideAsync(forza);
        Clock.UtcNow = Clock.UtcNow.AddMinutes(1);

        // Two tabs, or a press answered slowly and pressed again: the first one's answer, and
        // nothing moves up the list.
        await HideAsync(horizon);

        (await HiddenAsync()).Select(title => title.MediaId).ShouldBe([forza, horizon]);
    }

    [Fact]
    public async Task Hiding_a_title_that_is_not_a_game_is_not_found()
    {
        var film = await GivenMovieAsync("Arrival");

        (await Client.PutAsync($"{HiddenRoute}/{film}", content: null, Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);
        (await Client.PutAsync($"{HiddenRoute}/{film + 1000}", content: null, Ct)).StatusCode
            .ShouldBe(HttpStatusCode.NotFound);

        (await HiddenAsync()).ShouldBeEmpty();
    }

    // ----------------------------------------------------------- showing it again

    [Fact]
    public async Task Showing_a_game_again_puts_it_back()
    {
        Igdb.MostRated = [FakeIgdbClient.Game(1, "Tunic II"), FakeIgdbClient.Game(2, "Horizon Zero Dawn")];
        var horizon = (await TitlesAsync("most-played")).Single(title => title.Title == "Horizon Zero Dawn").Id;

        await HideAsync(horizon);
        (await TitlesAsync("most-played")).Select(title => title.Title).ShouldBe(["Tunic II"]);

        await ShowAgainAsync(horizon);

        (await TitlesAsync("most-played")).Select(title => title.Title).ShouldBe(["Tunic II", "Horizon Zero Dawn"]);
        (await HiddenAsync()).ShouldBeEmpty();
    }

    [Fact]
    public async Task Showing_again_a_game_that_was_not_hidden_is_no_error()
    {
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156");

        // Undo pressed twice, or Show again in a second tab: what was asked for is already so.
        await ShowAgainAsync(horizon);
    }

    [Fact]
    public async Task Showing_a_game_again_leaves_somebody_elses_hide_where_it_is()
    {
        var other = await GivenUserAsync("Somebody Else");
        var theirs = ClientFor(other);
        Igdb.MostRated = [FakeIgdbClient.Game(1, "Tunic II"), FakeIgdbClient.Game(2, "Horizon Zero Dawn")];
        var horizon = (await TitlesAsync("most-played")).Single(title => title.Title == "Horizon Zero Dawn").Id;

        await HideAsync(horizon);
        await HideAsync(horizon, theirs);

        await ShowAgainAsync(horizon);

        (await HiddenAsync(theirs)).Select(title => title.MediaId).ShouldBe([horizon]);
        (await TitlesAsync("most-played", theirs)).Select(title => title.Title).ShouldBe(["Tunic II"]);
    }

    // -------------------------------------------------------------- the account

    [Fact]
    public async Task Hiding_needs_a_session()
    {
        (await AnonymousClient.GetAsync(HiddenRoute, Ct)).StatusCode.ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.PutAsync($"{HiddenRoute}/1", content: null, Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
        (await AnonymousClient.DeleteAsync($"{HiddenRoute}/1", Ct)).StatusCode
            .ShouldBe(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Deleting_an_account_takes_its_hides_and_nobody_elses()
    {
        var other = await GivenUserAsync("Somebody Else");
        var horizon = await GivenGameAsync("Horizon Zero Dawn", externalId: "11156");

        await HideAsync(horizon);
        await HideAsync(horizon, ClientFor(other));

        (await Client.DeleteAsync("/api/account", Ct)).StatusCode.ShouldBe(HttpStatusCode.NoContent);

        // The users row goes and the database takes the rest, as it takes every pass.
        (await WithDbAsync(db => db.Database
            .SqlQuery<int>($"SELECT user_id AS \"Value\" FROM discover_hides")
            .ToListAsync(Ct))).ShouldBe([other]);
    }

    // ------------------------------------------------------------------ arranging

    private Task HideAsync(int mediaId, HttpClient? client = null) =>
        SendAsync((client ?? Client).PutAsync($"{HiddenRoute}/{mediaId}", content: null, Ct));

    private Task ShowAgainAsync(int mediaId, HttpClient? client = null) =>
        SendAsync((client ?? Client).DeleteAsync($"{HiddenRoute}/{mediaId}", Ct));

    /// <summary>A hide or a show again, which answers the same 204 whether or not it changed anything.</summary>
    private static async Task SendAsync(Task<HttpResponseMessage> request) =>
        (await request).StatusCode.ShouldBe(HttpStatusCode.NoContent);

    private async Task<List<HiddenTitleDto>> HiddenAsync(HttpClient? client = null)
    {
        var response = await (client ?? Client).GetAsync(HiddenRoute, Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync<List<HiddenTitleDto>>(response);
    }

    private async Task<List<GameDto>> TitlesAsync(string list, HttpClient? client = null) =>
        [.. (await PageAsync(list, client: client)).Titles];

    private async Task<DiscoverListPage<GameDto>> PageAsync(string list, int? from = null, HttpClient? client = null)
    {
        var response = await (client ?? Client).GetAsync(
            from is null ? $"/api/games/discover/{list}" : $"/api/games/discover/{list}?from={from}", Ct);
        response.StatusCode.ShouldBe(HttpStatusCode.OK);

        return await ReadAsync<DiscoverListPage<GameDto>>(response);
    }

    /// <summary>Puts games on one of the four lists that are the same for everybody, in this order.</summary>
    private void OnList(string list, params IgdbGame[] games)
    {
        switch (list)
        {
            case "new-releases":
                Igdb.NewReleases = [.. games];
                break;
            case "popular-now":
                Igdb.PlayingNow = [.. games];
                break;
            case "most-anticipated":
                Igdb.Anticipated = [.. games];
                break;
            case "most-played":
                Igdb.MostRated = [.. games];
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(list), list, null);
        }
    }

    /// <summary>
    /// A game as a list would offer it: dated after the stopped clock on Most anticipated, which
    /// keeps only what the calendar would call upcoming, and out already everywhere else.
    /// </summary>
    private static IgdbGame Offered(string list, int id, string name) => list == "most-anticipated"
        ? FakeIgdbClient.Game(id, name, releaseDate: new DateOnly(2027, 3, 12), dateFormat: "YYYYMMDD")
        : FakeIgdbClient.Game(id, name);

    /// <summary>A game From your ratings can offer: rated by enough people to clear its floor.</summary>
    private static IgdbGame Known(int id, string name, int ratings = 100) =>
        FakeIgdbClient.Game(id, name, ratings: ratings);

    private void IgdbKnows(params IgdbGame[] games)
    {
        foreach (var game in games)
        {
            Igdb.ById[game.Id] = game;
        }
    }

    /// <summary>
    /// Hollow Knight on your board, finished and rated 9 — a seed for From your ratings — naming
    /// <paramref name="similar"/> as what IGDB calls like it.
    /// </summary>
    private async Task RatedNineAsync(int[] similar)
    {
        Igdb.ById[14593] = FakeIgdbClient.Game(14593, "Hollow Knight", similarGames: similar, ratings: 100);

        var hollow = await GivenGameAsync("Hollow Knight", externalId: "14593");
        await GivenLogEntryAsync(hollow, LogStatus.Completed, rating: 9m, completedAt: Eastern(2026, 9, 1));
    }
}
