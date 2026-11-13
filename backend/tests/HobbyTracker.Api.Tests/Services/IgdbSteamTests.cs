using HobbyTracker.Api.Integrations.Igdb.Models;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Which Steam app is a game's store page, by the rule measured on the user's board on
/// 12 November 2026: <b>the <c>websites</c> row of Steam's type first, then a lone
/// <c>external_games</c> row of Steam's source</b>.
///
/// IGDB named a Steam page on the title's own entry for 64 of the 91. Eight entries named two apps
/// in <c>external_games</c>, and in all eight the <c>websites</c> row was the store page: the other
/// was a demo (<i>Until Then</i>), a playtest (<i>Nine Sols</i>), a Japanese release sold as an app
/// of its own (three Trails games), or an old id Steam forwards to the store page.
/// </summary>
public sealed class IgdbSteamTests
{
    [Fact]
    public void Takes_the_store_page_ahead_of_the_external_ids()
    {
        // Until Then: its demo first among the external ids, and the store page in websites.
        var game = FakeIgdbClient.Links(136725, "until-then", storePage: 1574820, 2296400, 1574820);

        IgdbSteam.AppIdOf(game).ShouldBe(1574820);
    }

    [Fact]
    public void Takes_a_lone_external_id_where_websites_names_no_store_page()
    {
        // 62 of the 64 had one this way; two had a store page in websites alone.
        var game = FakeIgdbClient.Links(115289, "hollow-knight-silksong", storePage: null, 1030300);

        IgdbSteam.AppIdOf(game).ShouldBe(1030300);
    }

    [Fact]
    public void Takes_neither_of_two_external_ids_with_no_store_page_to_say_which()
    {
        // Never seen on the board, and the eight that came close say why it would be a coin flip:
        // the second app is as likely to be a demo or another region's release as the game.
        var game = FakeIgdbClient.Links(1, "two-apps", storePage: null, 2113920, 2668430);

        IgdbSteam.AppIdOf(game).ShouldBeNull();
    }

    [Fact]
    public void Takes_one_id_named_twice_as_one()
    {
        // The same app in two rows is one app, not a choice.
        var game = FakeIgdbClient.Links(1, "twice", storePage: null, 1627720, 1627720);

        IgdbSteam.AppIdOf(game).ShouldBe(1627720);
    }

    [Fact]
    public void Reads_only_steams_rows()
    {
        // A GOG id among the external ids and a site that is not a store page: neither is Steam's,
        // and IGDB's numbers for other services are just as numeric.
        var game = FakeIgdbClient.Links(1, "not-on-steam", storePage: null);

        IgdbSteam.AppIdOf(game).ShouldBeNull();
    }

    [Theory]
    [InlineData("https://store.steampowered.com/app/1627720")]
    [InlineData("https://store.steampowered.com/app/1627720/")]
    [InlineData("https://store.steampowered.com/app/1627720/Lies_Of_P")]
    [InlineData("https://store.steampowered.com/app/1627720/Lies_of_P/")]
    [InlineData("http://store.steampowered.com/app/1627720/")]
    public void Reads_the_app_out_of_a_store_address_in_every_shape_igdb_writes_it(string url)
    {
        // The four shapes on the board — with and without a slash, with and without a name — and
        // the scheme IGDB could as easily have written.
        var game = new IgdbGame { Id = 1, Websites = [new IgdbWebsite { Url = url, Type = 13 }] };

        IgdbSteam.AppIdOf(game).ShouldBe(1627720);
    }

    [Fact]
    public void Leaves_a_steam_website_that_is_not_a_store_page_to_the_external_ids()
    {
        // A community hub filed under Steam's type would name no app; the external id still does.
        var game = new IgdbGame
        {
            Id = 1,
            Websites = [new IgdbWebsite { Url = "https://steamcommunity.com/app/1627720", Type = 13 }],
            ExternalGames = [new IgdbExternalGame { Uid = "1627720", ExternalGameSource = 1 }],
        };

        IgdbSteam.AppIdOf(game).ShouldBe(1627720);
    }

    [Fact]
    public void Leaves_out_an_external_id_that_is_not_a_number()
    {
        var game = new IgdbGame
        {
            Id = 1,
            ExternalGames = [new IgdbExternalGame { Uid = "not-an-app", ExternalGameSource = 1 }],
        };

        IgdbSteam.AppIdOf(game).ShouldBeNull();
    }

    [Fact]
    public void Answers_null_for_a_game_with_nothing_elsewhere()
    {
        IgdbSteam.AppIdOf(new IgdbGame { Id = 1 }).ShouldBeNull();
    }
}
