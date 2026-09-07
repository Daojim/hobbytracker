using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The board, asked about anime.
///
/// <see cref="TvBoardTests"/>'s sibling, and it carries that file's warning twice over: the TPT
/// downcasts these exercise live in two terminal projections and one sort arm, and a downcast
/// that stops translating empties a column <b>with no error at all</b>. So several of these
/// assert a column comes back non-empty, because emptiness is the symptom rather than an
/// exception.
///
/// One of them is new to this hobby. A card here carries a <b>second title</b> — romaji from
/// MAL with the English underneath — which is a field no board row had before, and it reaches
/// the row through the same downcast as everything else.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class AnimeBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_board_row_for_an_anime_carries_its_genres()
    {
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren", genres: ["Adventure", "Drama", "Fantasy"]);

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var row = (await BoardAsync()).Items.ShouldHaveSingleItem();
        row.Genres.ShouldBe(["Adventure", "Drama", "Fantasy"]);
        row.PrimaryGenre.ShouldBeNull();
    }

    [Fact]
    public async Task A_board_row_for_an_anime_says_how_long_the_whole_cour_is()
    {
        // 28 episodes of 1470 seconds is 41160 seconds, 686 minutes, 11.43 hours. The unit
        // conversion is Postgres's, which is the whole reason the column is generated: the card
        // and sort=length both read this one field and neither repeats the arithmetic.
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren", episodeCount: 28, episodeRuntimeSeconds: 1470);

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        (await BoardAsync()).Items.ShouldHaveSingleItem().LengthHours.ShouldBe(11.43m);
    }

    [Fact]
    public async Task An_anime_nobody_timed_has_no_length_rather_than_nought()
    {
        var mediaId = await GivenAnimeAsync("Untimed", episodeCount: 12);
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        (await BoardAsync()).Items.ShouldHaveSingleItem().LengthHours.ShouldBeNull();
    }

    [Fact]
    public async Task An_anime_is_never_waiting_on_HowLongToBeat()
    {
        var mediaId = await GivenAnimeAsync();
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        // False, not true. The type test in the projection is what makes it so, and getting it
        // wrong would set the anime board polling every three seconds for ever.
        (await BoardAsync()).Items.ShouldHaveSingleItem().HltbPending.ShouldBeFalse();
    }

    [Fact]
    public async Task A_board_row_carries_the_english_title_under_the_romaji_one()
    {
        // The second stretch this hobby asks of the platform. `media.title` holds the romaji,
        // because that is MAL's own `title` and what its search matches on — so every other
        // thing the platform does with a title needs no special case, and this is the extra one.
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren", englishTitle: "Frieren: Beyond Journey's End");

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var row = (await BoardAsync()).Items.ShouldHaveSingleItem();
        row.Title.ShouldBe("Sousou no Frieren");
        row.Subtitle.ShouldBe("Frieren: Beyond Journey's End");
    }

    [Fact]
    public async Task An_anime_MAL_has_no_english_title_for_carries_none()
    {
        // Null is the ordinary case rather than an error — MAL leaves `en` absent on a great
        // many entries — and the card renders nothing rather than an empty line.
        var mediaId = await GivenAnimeAsync("Ping Pong the Animation");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        (await BoardAsync()).Items.ShouldHaveSingleItem().Subtitle.ShouldBeNull();
    }

    [Fact]
    public async Task Every_other_hobby_carries_no_subtitle_at_all()
    {
        // The field is the platform's rather than anime's, so the honest answer for a hobby with
        // no such idea is null — the LEFT JOIN behind the downcast gives that for free, which is
        // the same mechanism `Genres` and `LengthHours` already lean on.
        await GivenLogEntryAsync(await GivenGameAsync("Celeste"), LogStatus.InProgress);
        await GivenLogEntryAsync(await GivenMovieAsync("Arrival"), LogStatus.InProgress);
        await GivenLogEntryAsync(await GivenShowAsync("Severance"), LogStatus.InProgress);

        foreach (var hobby in new[] { "games", "movies", "tv" })
        {
            var row = (await BoardAsync(hobby: hobby)).Items.ShouldHaveSingleItem();
            row.Subtitle.ShouldBeNull();
        }
    }

    [Fact]
    public async Task A_move_answers_with_the_same_row_the_board_reports()
    {
        // The two terminal projections have to agree. A field populated in one and null in the
        // other flickers on a drag: the move's own response is what the board caches, and
        // nulling only ItemAsync is the failure that reads as flicker rather than as a gap.
        var mediaId = await GivenAnimeAsync(
            "Sousou no Frieren",
            englishTitle: "Frieren: Beyond Journey's End",
            episodeCount: 28,
            episodeRuntimeSeconds: 1470,
            genres: ["Adventure", "Fantasy"]);

        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var moved = await ReadAsync<LibraryItemDto>(await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status",
            new StatusTransitionRequest(LogStatus.Completed),
            Json,
            Ct));

        moved.Subtitle.ShouldBe("Frieren: Beyond Journey's End");
        moved.Genres.ShouldBe(["Adventure", "Fantasy"]);
        moved.LengthHours.ShouldBe(11.43m);

        var row = (await BoardAsync(LogStatus.Completed)).Items.ShouldHaveSingleItem();
        row.Subtitle.ShouldBe(moved.Subtitle);
        row.Genres.ShouldBe(moved.Genres);
        row.LengthHours.ShouldBe(moved.LengthHours);
    }

    [Fact]
    public async Task A_pass_on_an_anime_records_an_episode_and_no_season()
    {
        // What the dropped check constraint was in the way of, end to end. A cour is the entry,
        // so where you are inside it is one number — and the board row carries it through the
        // same two fields a show's pair uses, because they are the same two columns.
        var mediaId = await GivenAnimeAsync("Sousou no Frieren");
        await GivenLogEntryAsync(mediaId, LogStatus.InProgress);

        var entries = await ReadAsync<PagedResult<LogEntryDto>>(
            await Client.GetAsync($"/api/log-entries?mediaId={mediaId}", Ct));

        await Client.PutAsJsonAsync(
            $"/api/log-entries/{entries.Items[0].Id}",
            new UpdateLogEntryRequest(
                LogStatus.InProgress, null, null, null, null, null, EpisodeNumber: 12),
            Json,
            Ct);

        var row = (await BoardAsync()).Items.ShouldHaveSingleItem();
        row.SeasonNumber.ShouldBeNull();
        row.EpisodeNumber.ShouldBe(12);
    }

    [Fact]
    public async Task One_sort_orders_all_four_boards_without_any_of_them_knowing_the_others()
    {
        // The Length arm is the one place in this codebase where an expression that stops
        // translating breaks a sort mode rather than erroring, so a fourth coalesce there is
        // the row of the checklist that fails quietly. Non-empty is half the assertion.
        await GivenLogEntryAsync(
            await GivenAnimeAsync("Long Cour", episodeCount: 28, episodeRuntimeSeconds: 1470),
            LogStatus.Completed);

        await GivenLogEntryAsync(
            await GivenAnimeAsync(
                "Short Cour", externalId: "2", episodeCount: 12, episodeRuntimeSeconds: 1440),
            LogStatus.Completed);

        await GivenLogEntryAsync(
            await GivenAnimeAsync("Untimed Cour", externalId: "3"), LogStatus.Completed);

        await GivenLogEntryAsync(
            await GivenShowAsync("A Show", numberOfEpisodes: 62, episodeRuntimeMinutes: 45),
            LogStatus.Completed);

        await GivenLogEntryAsync(await GivenMovieAsync("A Film", runtimeMinutes: 116), LogStatus.Completed);
        await GivenLogEntryAsync(await GivenGameAsync("A Game"), LogStatus.Completed);

        var anime = await BoardAsync(LogStatus.Completed, LibrarySort.Length);

        anime.Items.ShouldNotBeEmpty();
        anime.Items.Select(item => item.Title).ShouldBe(["Short Cour", "Long Cour", "Untimed Cour"]);

        var shows = await BoardAsync(LogStatus.Completed, LibrarySort.Length, hobby: "tv");
        shows.Items.ShouldHaveSingleItem().Title.ShouldBe("A Show");

        var films = await BoardAsync(LogStatus.Completed, LibrarySort.Length, hobby: "movies");
        films.Items.ShouldHaveSingleItem().Title.ShouldBe("A Film");

        var games = await BoardAsync(LogStatus.Completed, LibrarySort.Length, hobby: "games");
        games.Items.ShouldHaveSingleItem().Title.ShouldBe("A Game");
    }

    private async Task<PagedResult<LibraryItemDto>> BoardAsync(
        LogStatus? status = null, LibrarySort? sort = null, string hobby = "anime")
    {
        var query = $"/api/library?hobby={hobby}";

        if (status is { } wanted)
        {
            query += $"&status={wanted}";
        }

        if (sort is { } ordering)
        {
            query += $"&sort={ordering.ToString().ToLowerInvariant()}";
        }

        return await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(query, Ct));
    }
}
