using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Integrations.Igdb;
using HobbyTracker.Api.Integrations.OpenCritic;
using HobbyTracker.Api.Integrations.Steam;
using HobbyTracker.Api.Integrations.Wikidata;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// A game's OpenCritic and Steam pages in the journal (#22): where each page is found, what each
/// says, and the pin that corrects OpenCritic's.
///
/// <para>
/// <b>The pages are found the first time a journal asks, then kept</b> — Steam's from IGDB, and
/// OpenCritic's from Wikidata by IGDB's slug, with no matching. <b>What each says is asked when the
/// journal opens and kept a day under the provider's own id</b>, never under a person, because a
/// score is the same for everybody who opens the game.
/// </para>
///
/// <para>
/// <b>Each half stands alone.</b> OpenCritic's free plan is 200 requests a day and Steam's keyless
/// route is shared with every keyless caller, so either can be unhappy on a given day, and the one
/// that is takes its own verdict with it and nothing else: that row is its link alone.
/// </para>
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class GameReviewsTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    // NieR: Automata, as the user's board has it: IGDB 11208, the store page 524220, and three
    // OpenCritic ids on Wikidata's item — the game and two editions.
    private const int Nier = 11208;
    private const string NierSlug = "nier-automata";
    private const int NierApp = 524220;
    private const int NierCritics = 3540;

    /// <summary>NieR: Automata on the board, IGDB naming its store page and Wikidata its one OpenCritic id.</summary>
    private async Task<int> GivenNierAsync()
    {
        var mediaId = await GivenGameAsync("NieR: Automata", Nier.ToString(System.Globalization.CultureInfo.InvariantCulture));
        await GivenLogEntryAsync(mediaId);

        Igdb.StoreLinks[Nier] = FakeIgdbClient.Links(Nier, NierSlug, storePage: NierApp, NierApp);
        Wikidata.BySlug[NierSlug] = [NierCritics];
        OpenCritic.Add(NierCritics, "Nier: Automata", 89.36206896551724, "Mighty", 92.76315789473685);
        Steam.ByApp[NierApp] = new SteamReviewSummary("Very Positive", 63155, 67712);

        return mediaId;
    }

    // ---------------------------------------------------------------- the journal's read

    [Fact]
    public async Task The_journals_read_carries_both_pages()
    {
        // Facts about the game, as its HowLongToBeat id is, so the links are drawn the moment the
        // journal opens while what each page says is still being asked.
        var mediaId = await GivenGameAsync("Armored Core VI: Fires of Rubicon", "250616");
        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.SteamAppId = 1888160;
            game.OpenCriticId = 15125;
            await db.SaveChangesAsync(Ct);
        });

        var detail = await ReadAsync<GameDetailDto>(await Client.GetAsync($"/api/games/{mediaId}", Ct));

        detail.OpenCriticId.ShouldBe(15125);
        detail.SteamAppId.ShouldBe(1888160);
    }

    // ------------------------------------------------------------- finding the pages

    [Fact]
    public async Task Finds_both_pages_the_first_time_a_journal_asks()
    {
        var mediaId = await GivenNierAsync();

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCriticId.ShouldBe(NierCritics);
        answer.SteamAppId.ShouldBe(NierApp);

        // IGDB asked once, for the slug and the store page together, and Wikidata by the slug.
        Igdb.StoreLinkLookups.ShouldBe([Nier]);
        Wikidata.Lookups.ShouldBe([NierSlug]);

        var stored = await StoredAsync(mediaId);
        stored.OpenCriticId.ShouldBe(NierCritics);
        stored.SteamAppId.ShouldBe(NierApp);
        stored.OpenCriticLookedForAt.ShouldBe(Clock.UtcNow);
        stored.SteamLookedForAt.ShouldBe(Clock.UtcNow);
    }

    [Fact]
    public async Task Keeps_the_pages_it_found_and_never_looks_for_them_again()
    {
        var mediaId = await GivenNierAsync();
        await GetReviewsAsync(mediaId);

        // A year on, past any recheck: a page found is kept, because which page a game has does not
        // change. What the page says does, and that is asked for, not stored.
        Clock.UtcNow = Clock.UtcNow.AddDays(365);
        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCriticId.ShouldBe(NierCritics);
        Igdb.StoreLinkLookups.ShouldHaveSingleItem();
        Wikidata.Lookups.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task A_game_found_to_have_neither_page_is_not_asked_about_on_every_open()
    {
        // Paper Mario: The Thousand-Year Door, the remake: a Switch game, so no Steam page, and a
        // later version Wikidata files under the original, so no OpenCritic id either.
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");
        Igdb.StoreLinks[283977] = FakeIgdbClient.Links(283977, "paper-mario-the-thousand-year-door--1");

        var first = await ReviewsOfAsync(mediaId);
        await GetReviewsAsync(mediaId);

        first.ShouldBe(new GameReviewsDto(null, null, null, null));
        Igdb.StoreLinkLookups.ShouldHaveSingleItem();
        Wikidata.Lookups.ShouldHaveSingleItem();

        // Stamped on the miss, which is the whole of what stops the second open asking again.
        var stored = await StoredAsync(mediaId);
        stored.SteamLookedForAt.ShouldBe(Clock.UtcNow);
        stored.OpenCriticLookedForAt.ShouldBe(Clock.UtcNow);
    }

    [Theory]
    [InlineData(29, false)]
    [InlineData(31, true)]
    public async Task Looks_again_for_a_page_it_found_none_of_a_month_later(int daysLater, bool asksAgain)
    {
        // A game not out yet often has no OpenCritic id on Wikidata, and a console game can come
        // to Steam: a page found missing is looked for again once a month, as HowLongToBeat
        // re-asks about a title it could not match.
        var mediaId = await GivenGameAsync("Ghost of Yōtei", "300978");
        Igdb.StoreLinks[300978] = FakeIgdbClient.Links(300978, "ghost-of-yotei");
        await GetReviewsAsync(mediaId);

        Clock.UtcNow = Clock.UtcNow.AddDays(daysLater);
        Igdb.StoreLinks[300978] = FakeIgdbClient.Links(300978, "ghost-of-yotei", storePage: 3489700, 3489700);
        Wikidata.BySlug["ghost-of-yotei"] = [18630];

        var answer = await ReviewsOfAsync(mediaId);

        Igdb.StoreLinkLookups.Count.ShouldBe(asksAgain ? 2 : 1);
        answer.SteamAppId.ShouldBe(asksAgain ? 3489700 : null);
        answer.OpenCriticId.ShouldBe(asksAgain ? 18630 : null);
    }

    [Fact]
    public async Task A_game_with_no_page_of_its_own_on_steam_has_no_steam_half()
    {
        // Round one's call: its own page only. Castlevania: Circle of the Moon is sold on Steam
        // inside the Advance Collection, and gets no Steam row for it.
        var mediaId = await GivenGameAsync("Castlevania: Circle of the Moon", "1138");
        Igdb.StoreLinks[1138] = FakeIgdbClient.Links(1138, "castlevania-circle-of-the-moon");
        Wikidata.BySlug["castlevania-circle-of-the-moon"] = [];

        var answer = await ReviewsOfAsync(mediaId);

        answer.SteamAppId.ShouldBeNull();
        answer.Steam.ShouldBeNull();
        Steam.Lookups.ShouldBeEmpty();
    }

    // ------------------------------------------------------------------- what each says

    [Fact]
    public async Task Answers_what_each_page_says()
    {
        var mediaId = await GivenNierAsync();

        var answer = await ReviewsOfAsync(mediaId);

        // Unrounded, and in no words: the journal writes "89 · Mighty · 93% recommend" from these.
        answer.OpenCritic.ShouldBe(new OpenCriticVerdictDto(89.36206896551724, "Mighty", 92.76315789473685));
        answer.Steam.ShouldBe(new SteamVerdictDto("Very Positive", 63155, 67712));
    }

    [Fact]
    public async Task Answers_no_score_as_no_score()
    {
        // OpenCritic's -1, which the client reads as nothing: a game not out, or Rabbit and Steel
        // with three critic reviews. The journal tells the two apart by whether the game is out.
        var mediaId = await GivenGameAsync("Rabbit & Steel", "229093");
        Igdb.StoreLinks[229093] = FakeIgdbClient.Links(229093, "rabbit-steel", storePage: 2132850, 2132850);
        Wikidata.BySlug["rabbit-steel"] = [16687];
        OpenCritic.Add(16687, "Rabbit and Steel");
        Steam.ByApp[2132850] = new SteamReviewSummary("Overwhelmingly Positive", 7071, 7224);

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCritic.ShouldBe(new OpenCriticVerdictDto(null, null, null));
    }

    [Fact]
    public async Task Keeps_each_verdict_for_the_day_and_asks_again_the_next()
    {
        var mediaId = await GivenNierAsync();

        await GetReviewsAsync(mediaId);
        await GetReviewsAsync(mediaId);

        OpenCritic.Lookups.ShouldBe([NierCritics]);
        Steam.Lookups.ShouldBe([NierApp]);

        // The journal's day turns over at midnight Eastern, and the frozen clock is midday UTC.
        Clock.UtcNow = Clock.UtcNow.AddDays(1);
        await GetReviewsAsync(mediaId);

        OpenCritic.Lookups.ShouldBe([NierCritics, NierCritics]);
        Steam.Lookups.ShouldBe([NierApp, NierApp]);
    }

    [Fact]
    public async Task Keeps_each_verdict_under_the_providers_own_id()
    {
        // The Witcher 3 Remastered names the original's Steam page, because on Steam the remaster
        // is an update to it: two games, one app, and one question to Steam a day.
        var original = await GivenGameAsync("The Witcher 3: Wild Hunt", "1942");
        var remaster = await GivenGameAsync("The Witcher 3: Wild Hunt Remastered", "205780");
        Igdb.StoreLinks[1942] = FakeIgdbClient.Links(1942, "the-witcher-3-wild-hunt", storePage: 292030, 292030);
        Igdb.StoreLinks[205780] = FakeIgdbClient.Links(205780, "the-witcher-3-wild-hunt--1", storePage: 292030);
        Steam.ByApp[292030] = new SteamReviewSummary("Overwhelmingly Positive", 728196, 754210);

        await GetReviewsAsync(original);
        var answer = await ReviewsOfAsync(remaster);

        answer.Steam.ShouldBe(new SteamVerdictDto("Overwhelmingly Positive", 728196, 754210));
        Steam.Lookups.ShouldBe([292030]);
    }

    [Fact]
    public async Task Two_people_opening_one_game_ask_each_provider_once()
    {
        // Never under a person: a score is the same for everybody, and the catalogue is shared.
        var mediaId = await GivenNierAsync();
        var other = await GivenUserAsync("Someone Else");
        await GivenLogEntryAsync(mediaId, userId: other);

        await GetReviewsAsync(mediaId);
        var theirs = await ReadAsync<GameReviewsDto>(
            await ClientFor(other).GetAsync($"/api/games/{mediaId}/reviews", Ct));

        theirs.OpenCriticId.ShouldBe(NierCritics);
        OpenCritic.Lookups.ShouldHaveSingleItem();
        Steam.Lookups.ShouldHaveSingleItem();
    }

    // ------------------------------------------------------------- each half stands alone

    [Fact]
    public async Task OpenCritic_failing_takes_its_own_verdict_and_nothing_else()
    {
        var mediaId = await GivenNierAsync();
        OpenCritic.ThrowOnNextCall = new OpenCriticException("OpenCritic's daily allowance is spent.");

        var response = await GetReviewsAsync(mediaId);
        var answer = await ReadAsync<GameReviewsDto>(response);

        // A 200, the page still known, and Steam still answered: the row is its link alone.
        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        answer.OpenCriticId.ShouldBe(NierCritics);
        answer.OpenCritic.ShouldBeNull();
        answer.Steam.ShouldNotBeNull();
    }

    [Fact]
    public async Task Steam_failing_takes_its_own_verdict_and_nothing_else()
    {
        var mediaId = await GivenNierAsync();
        Steam.ThrowOnNextCall = new SteamException("Steam rate limit exceeded.");

        var answer = await ReviewsOfAsync(mediaId);

        answer.SteamAppId.ShouldBe(NierApp);
        answer.Steam.ShouldBeNull();
        answer.OpenCritic.ShouldNotBeNull();
    }

    [Fact]
    public async Task A_failure_is_not_kept()
    {
        // Kept, it would be a day of no verdict for one bad answer.
        var mediaId = await GivenNierAsync();
        OpenCritic.ThrowOnNextCall = new OpenCriticException("down");
        Steam.ThrowOnNextCall = new SteamException("down");
        await GetReviewsAsync(mediaId);

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCritic.ShouldNotBeNull();
        answer.Steam.ShouldNotBeNull();
    }

    [Fact]
    public async Task IGDB_failing_finds_nothing_and_stamps_nothing()
    {
        // The look could not be made, which is not the same as a look that found nothing: stamped,
        // it would leave the game without its pages for a month.
        var mediaId = await GivenNierAsync();
        Igdb.ThrowOnNextCall = new IgdbException("down");

        var first = await ReviewsOfAsync(mediaId);
        var stored = await StoredAsync(mediaId);

        first.ShouldBe(new GameReviewsDto(null, null, null, null));
        stored.SteamLookedForAt.ShouldBeNull();
        stored.OpenCriticLookedForAt.ShouldBeNull();

        var second = await ReviewsOfAsync(mediaId);
        second.OpenCriticId.ShouldBe(NierCritics);
        second.SteamAppId.ShouldBe(NierApp);
    }

    [Fact]
    public async Task Wikidata_failing_leaves_the_steam_page_found()
    {
        var mediaId = await GivenNierAsync();
        Wikidata.ThrowOnNextCall = new WikidataException("down");

        var first = await ReviewsOfAsync(mediaId);

        first.SteamAppId.ShouldBe(NierApp);
        first.OpenCriticId.ShouldBeNull();
        (await StoredAsync(mediaId)).OpenCriticLookedForAt.ShouldBeNull();

        // And asked again on the next open, rather than a month later.
        var second = await ReviewsOfAsync(mediaId);
        second.OpenCriticId.ShouldBe(NierCritics);
    }

    // ---------------------------------------------------------- several OpenCritic ids

    [Fact]
    public async Task Of_several_ids_takes_the_one_opencritic_names_as_igdb_does()
    {
        // NieR: Automata's item carries the game and two editions. OpenCritic writes the game
        // "Nier: Automata" where IGDB writes "NieR: Automata", so case is not part of a name.
        var mediaId = await GivenNierAsync();
        Wikidata.BySlug[NierSlug] = [6310, 7334, NierCritics];
        OpenCritic.Add(6310, "NieR: Automata Become as Gods Edition", 91.59, "Mighty", 89.29);
        OpenCritic.Add(7334, "NieR: Automata Game of the YoRHa Edition", 91.33, "Mighty", 100);

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCriticId.ShouldBe(NierCritics);
        answer.OpenCritic!.TopCriticScore.ShouldBe(89.36206896551724);

        // Each name asked for once, and the verdict read from the answer that named it rather than
        // asked for a fourth time: the free plan is 200 requests a day.
        OpenCritic.Lookups.ShouldBe([6310, 7334, NierCritics], ignoreOrder: true);
    }

    [Fact]
    public async Task Of_several_ids_none_named_as_igdb_does_takes_none()
    {
        // A refusal rather than a guess, as HowLongToBeat's matcher refuses, and stamped, so the
        // names are not asked for again on every open. The pin is for this.
        var mediaId = await GivenNierAsync();
        Wikidata.BySlug[NierSlug] = [6310, 7334];
        OpenCritic.Add(6310, "NieR: Automata Become as Gods Edition", 91.59, "Mighty", 89.29);
        OpenCritic.Add(7334, "NieR: Automata Game of the YoRHa Edition", 91.33, "Mighty", 100);

        var answer = await ReviewsOfAsync(mediaId);
        await GetReviewsAsync(mediaId);

        answer.OpenCriticId.ShouldBeNull();
        (await StoredAsync(mediaId)).OpenCriticLookedForAt.ShouldBe(Clock.UtcNow);
        Wikidata.Lookups.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task Of_several_ids_without_a_key_takes_none_and_asks_again_next_time()
    {
        // Without a key OpenCritic's names cannot be read, so nothing can be chosen yet — and it is
        // not a miss either, so it is not stamped: the next journal, perhaps with a key by then,
        // looks again. Two of the user's 91 titles are like this.
        var mediaId = await GivenNierAsync();
        OpenCritic.HasKey = false;
        Wikidata.BySlug[NierSlug] = [6310, 7334, NierCritics];

        var answer = await ReviewsOfAsync(mediaId);
        await GetReviewsAsync(mediaId);

        answer.OpenCriticId.ShouldBeNull();
        (await StoredAsync(mediaId)).OpenCriticLookedForAt.ShouldBeNull();
        Wikidata.Lookups.Count.ShouldBe(2);
    }

    // ------------------------------------------------------------------------ no key

    [Fact]
    public async Task Without_a_key_finds_the_page_and_asks_opencritic_nothing()
    {
        // The optional key's whole promise: OpenCritic's row is its link alone, from Wikidata's id,
        // and the score arrives once a key is set. The fake refuses to be asked without one.
        var mediaId = await GivenNierAsync();
        OpenCritic.HasKey = false;

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCriticId.ShouldBe(NierCritics);
        answer.OpenCritic.ShouldBeNull();
        answer.Steam.ShouldNotBeNull();
        OpenCritic.Lookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Answers_404_for_a_title_that_is_not_a_game()
    {
        var filmId = await GivenMovieAsync("Arrival", externalId: "329865");

        (await GetReviewsAsync(filmId)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    // ------------------------------------------------------------------------- the pin

    [Fact]
    public async Task Pinning_a_number_asks_opencritic_and_keeps_it()
    {
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");
        OpenCritic.Add(16438, "Paper Mario: The Thousand-Year Door", 88.4, "Mighty", 96.2);

        var response = await PinAsync(mediaId, 16438);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await ReadAsync<GameDetailDto>(response)).OpenCriticId.ShouldBe(16438);
        (await StoredAsync(mediaId)).OpenCriticId.ShouldBe(16438);
        OpenCritic.Lookups.ShouldBe([16438]);
    }

    [Fact]
    public async Task A_pin_keeps_the_verdict_it_asked_for()
    {
        // The pin asked OpenCritic about the number to find out whether it exists, and that answer
        // is the verdict the journal asks for next. Asking twice would spend the day's allowance on
        // one game.
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");
        Igdb.StoreLinks[283977] = FakeIgdbClient.Links(283977, "paper-mario-the-thousand-year-door--1");
        OpenCritic.Add(16438, "Paper Mario: The Thousand-Year Door", 88.4, "Mighty", 96.2);
        await PinAsync(mediaId, 16438);

        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCritic.ShouldBe(new OpenCriticVerdictDto(88.4, "Mighty", 96.2));
        OpenCritic.Lookups.ShouldBe([16438]);
    }

    [Fact]
    public async Task Refuses_a_number_opencritic_does_not_know_in_words()
    {
        // HowLongToBeat's pin's refusal, in OpenCritic's name. Storing the number anyway would draw
        // a link to a page that is not there, with no sign of why.
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");

        var response = await PinAsync(mediaId, 99_999_999);

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        using var problem = System.Text.Json.JsonDocument.Parse(await response.Content.ReadAsStringAsync(Ct));
        problem.RootElement.GetProperty("errors").GetProperty("OpenCriticId")
            .EnumerateArray().Select(said => said.GetString())
            .ShouldBe(["OpenCritic has no game 99999999."]);
        (await StoredAsync(mediaId)).OpenCriticId.ShouldBeNull();
    }

    [Fact]
    public async Task Without_a_key_keeps_a_pin_unchecked()
    {
        // Nothing can say whether the number is OpenCritic's, so it is kept as typed: the link is
        // there to follow, and the score arrives once a key is set.
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");
        OpenCritic.HasKey = false;

        var response = await PinAsync(mediaId, 16438);

        response.StatusCode.ShouldBe(HttpStatusCode.OK);
        (await StoredAsync(mediaId)).OpenCriticId.ShouldBe(16438);
        OpenCritic.Lookups.ShouldBeEmpty();
    }

    [Fact]
    public async Task Taking_a_pin_back_sends_the_game_to_be_looked_for_again()
    {
        // HowLongToBeat's rule: back to never asked, not to asked and found nothing, which would
        // leave the box empty for a month. Looked for once first, so there is a stamp to take back:
        // on a game never looked for, keeping the stamp and clearing it are the same, and the first
        // version of this test passed with the clearing planted out for exactly that reason.
        var mediaId = await GivenNierAsync();
        await GetReviewsAsync(mediaId);
        OpenCritic.Add(7334, "NieR: Automata Game of the YoRHa Edition", 91.33, "Mighty", 100);
        await PinAsync(mediaId, 7334);

        var cleared = await ReadAsync<GameDetailDto>(await PinAsync(mediaId, null));

        cleared.OpenCriticId.ShouldBeNull();
        (await StoredAsync(mediaId)).OpenCriticLookedForAt.ShouldBeNull();

        var answer = await ReviewsOfAsync(mediaId);
        answer.OpenCriticId.ShouldBe(NierCritics);
        Wikidata.Lookups.ShouldBe([NierSlug, NierSlug]);
    }

    [Fact]
    public async Task A_pin_replaces_a_page_found_and_no_later_look_overwrites_it()
    {
        var mediaId = await GivenNierAsync();
        await GetReviewsAsync(mediaId);
        OpenCritic.Add(7334, "NieR: Automata Game of the YoRHa Edition", 91.33, "Mighty", 100);

        await PinAsync(mediaId, 7334);
        Clock.UtcNow = Clock.UtcNow.AddDays(400);
        var answer = await ReviewsOfAsync(mediaId);

        answer.OpenCriticId.ShouldBe(7334);
        Wikidata.Lookups.ShouldHaveSingleItem();
    }

    [Fact]
    public async Task A_look_in_flight_never_overwrites_a_pin()
    {
        // The one moment a look and a pin can cross: a journal opened for the first time, and a
        // number typed into its box while Wikidata is still being asked. The look read an empty slot
        // before the pin and writes after it, so it may only ever write into a slot still empty.
        var mediaId = await GivenNierAsync();
        OpenCritic.Add(7334, "NieR: Automata Game of the YoRHa Edition", 91.33, "Mighty", 100);
        Wikidata.WhileAsking = async () => (await PinAsync(mediaId, 7334)).EnsureSuccessStatusCode();

        var answer = await ReviewsOfAsync(mediaId);

        (await StoredAsync(mediaId)).OpenCriticId.ShouldBe(7334);

        // And it answers for the page the game now has, not the one it went looking for.
        answer.OpenCriticId.ShouldBe(7334);
        answer.OpenCritic!.TopCriticScore.ShouldBe(91.33);
    }

    [Fact]
    public async Task Answers_404_for_a_pin_on_a_title_that_is_not_a_game()
    {
        var filmId = await GivenMovieAsync("Arrival", externalId: "329865");

        (await PinAsync(filmId, 16438)).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Answers_502_when_opencritic_cannot_be_read_for_a_pin()
    {
        // The one route that waits on OpenCritic, and so the one its exception handler can reach:
        // "the site we ask is unhappy" is a different message from "this API is broken".
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");
        OpenCritic.ThrowOnNextCall = new OpenCriticException("OpenCritic's daily allowance is spent.");

        var response = await PinAsync(mediaId, 16438);

        response.StatusCode.ShouldBe(HttpStatusCode.BadGateway);
        (await StoredAsync(mediaId)).OpenCriticId.ShouldBeNull();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task Refuses_a_number_below_one(int id)
    {
        var mediaId = await GivenGameAsync("Paper Mario: The Thousand-Year Door", "283977");

        (await PinAsync(mediaId, id)).StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        OpenCritic.Lookups.ShouldBeEmpty();
    }

    // ---------------------------------------------------------------------- helpers

    private Task<HttpResponseMessage> GetReviewsAsync(int mediaId) =>
        Client.GetAsync($"/api/games/{mediaId}/reviews", Ct);

    /// <summary>
    /// The answer, after asserting it is one. Read straight from a 500, the problem's body becomes a
    /// DTO of nulls, and a test asserting that there is no Steam half passes against a crash: the
    /// first run of this file, against a service that threw, had one do exactly that.
    /// </summary>
    private async Task<GameReviewsDto> ReviewsOfAsync(int mediaId)
    {
        var response = await GetReviewsAsync(mediaId);
        response.StatusCode.ShouldBe(HttpStatusCode.OK, await response.Content.ReadAsStringAsync(Ct));
        return await ReadAsync<GameReviewsDto>(response);
    }

    private Task<HttpResponseMessage> PinAsync(int mediaId, int? openCriticId) =>
        Client.PutAsJsonAsync(
            $"/api/games/{mediaId}/opencritic", new SetOpenCriticIdRequest(openCriticId), Json, Ct);

    private Task<Game> StoredAsync(int mediaId) =>
        WithDbAsync(db => db.Games.AsNoTracking().SingleAsync(game => game.Id == mediaId, Ct));
}
