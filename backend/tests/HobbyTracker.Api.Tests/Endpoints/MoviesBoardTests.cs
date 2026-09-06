using System.Net.Http.Json;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// The board, asked about films.
///
/// This is the area where being wrong is quiet. Every <c>Where</c> and <c>OrderBy</c> is pushed
/// through <c>LibraryService.BoardQuery</c>, so a TPT downcast that stops translating there
/// empties the whole board with no error at all — which is why the downcasts live in the two
/// terminal projections and the one sort arm, and why several of these assert that a column
/// comes back <b>non-empty</b>. Emptiness is the symptom.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class MoviesBoardTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task A_film_on_the_board_carries_its_genres_and_the_one_that_was_chosen()
    {
        // Genres were a games word on this row until movies arrived. They never were a games
        // concept — the column simply lived in the only detail table there was.
        var mediaId = await GivenMovieAsync(
            "Arrival", externalId: "329865", genres: ["Science Fiction", "Drama"]);

        await GivenLogEntryAsync(mediaId, LogStatus.Completed);
        await SetGenreAsync(mediaId, "Drama");

        var item = (await BoardAsync()).Items.ShouldHaveSingleItem();

        item.Genres.ShouldBe(["Science Fiction", "Drama"]);
        item.PrimaryGenre.ShouldBe("Drama");
    }

    [Fact]
    public async Task A_films_length_is_its_runtime_in_hours()
    {
        // The card prints this and sort=length orders on it, whichever hobby it is. 116 minutes
        // is 1.93 hours to two places, and the client turns it back into 1 h 56 m exactly —
        // two decimal places is at most 0.3 of a minute out, so the round trip is lossless.
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865", runtimeMinutes: 116);
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);

        var item = (await BoardAsync()).Items.ShouldHaveSingleItem();

        item.LengthHours.ShouldBe(1.93m);
    }

    [Fact]
    public async Task A_film_nobody_has_a_runtime_for_has_no_length()
    {
        var mediaId = await GivenMovieAsync("Some Short", externalId: "1");
        await GivenLogEntryAsync(mediaId, LogStatus.Completed);

        (await BoardAsync()).Items.ShouldHaveSingleItem().LengthHours.ShouldBeNull();
    }

    [Fact]
    public async Task A_film_is_never_waiting_on_HowLongToBeat()
    {
        // hltb_checked_at is null on a film because nothing will ever stamp it, and "there is no
        // games row" is a different claim from "nobody has looked yet". Conflating them would
        // set the movies board polling for an answer nobody is bringing — and unlike the old
        // test for this, there is now a real movies row underneath rather than nothing at all.
        var mediaId = await GivenMovieAsync("Arrival", externalId: "329865");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        (await BoardAsync(LogStatus.Backlog)).Items.ShouldHaveSingleItem()
            .HltbPending.ShouldBeFalse();
    }

    [Fact]
    public async Task Length_orders_films_shortest_first_and_the_unknown_last()
    {
        // That the column comes back non-empty is half of what this asserts. The runtime lives
        // on `movies`, so ordering by it needs a downcast — and when one of those fails to
        // translate the symptom is an empty column rather than an error that names itself.
        await GivenBacklogFilmAsync("Long", "1", 201);
        await GivenBacklogFilmAsync("Short", "2", 81);
        await GivenBacklogFilmAsync("Unknown", "3", null);
        await GivenBacklogFilmAsync("Middling", "4", 116);

        var column = await BoardAsync(LogStatus.Backlog, LibrarySort.Length);

        column.Items.Select(item => item.Title)
            .ShouldBe(["Short", "Middling", "Long", "Unknown"]);
    }

    [Fact]
    public async Task One_sort_orders_both_boards_without_either_knowing_about_the_other()
    {
        // The point of LengthHours being one field: a game's HowLongToBeat estimate and a film's
        // runtime are the same question, so this arm has no per-hobby branch to get wrong. Both
        // boards are asked here because a downcast that translates for one and not the other is
        // exactly the failure that would otherwise reach production silently.
        var film = await GivenBacklogFilmAsync("A Film", "1", 90);
        var game = await GivenGameAsync("A Game", externalId: "2");
        await GivenLogEntryAsync(game, LogStatus.Backlog);

        var films = await BoardAsync(LogStatus.Backlog, LibrarySort.Length, "movies");
        var games = await BoardAsync(LogStatus.Backlog, LibrarySort.Length, "games");

        films.Items.ShouldHaveSingleItem().MediaId.ShouldBe(film);
        games.Items.ShouldHaveSingleItem().MediaId.ShouldBe(game);
    }

    [Fact]
    public async Task A_hobby_with_no_detail_table_still_answers()
    {
        // Books have no table and will not until their phase. The board has to survive that
        // rather than throwing, because a downcast reaching for a row that is not there is the
        // ordinary case for four of the six hobbies.
        var mediaId = await GivenNonGameMediaAsync(SeedData.Hobbies.Books, "Some Book");
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var item = (await BoardAsync(LogStatus.Backlog, hobby: "books")).Items.ShouldHaveSingleItem();

        item.Genres.ShouldBeNull();
        item.LengthHours.ShouldBeNull();
        item.HltbPending.ShouldBeFalse();
    }

    [Fact]
    public async Task Moving_a_film_answers_with_the_same_row_the_board_would()
    {
        // ItemAsync is a hand-written copy of ListAsync's projection, and a field in one and not
        // the other makes a card flicker after a drag: the move answers with the row and the
        // board caches it.
        var mediaId = await GivenMovieAsync(
            "Arrival", externalId: "329865", runtimeMinutes: 116, genres: ["Drama"]);

        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);

        var moved = await ReadAsync<LibraryItemDto>(await Client.PostAsJsonAsync(
            $"/api/library/{mediaId}/status",
            new StatusTransitionRequest(LogStatus.InProgress),
            Json,
            Ct));

        moved.Genres.ShouldBe(["Drama"]);
        moved.LengthHours.ShouldBe(1.93m);
        moved.HltbPending.ShouldBeFalse();
    }

    private async Task<int> GivenBacklogFilmAsync(string title, string externalId, int? runtime)
    {
        var mediaId = await GivenMovieAsync(title, externalId, runtimeMinutes: runtime);
        await GivenLogEntryAsync(mediaId, LogStatus.Backlog);
        return mediaId;
    }

    private Task SetGenreAsync(int mediaId, string genre) =>
        Client.PutAsJsonAsync(
            $"/api/movies/{mediaId}/genre", new SetMovieGenreRequest(genre), Json, Ct);

    private async Task<PagedResult<LibraryItemDto>> BoardAsync(
        LogStatus? status = null, LibrarySort? sort = null, string hobby = "movies")
    {
        var url = $"/api/library?hobby={hobby}";
        if (status is { } wanted) { url += $"&status={wanted}"; }
        if (sort is { } chosen) { url += $"&sort={chosen}"; }

        return await ReadAsync<PagedResult<LibraryItemDto>>(await Client.GetAsync(url, Ct));
    }
}
