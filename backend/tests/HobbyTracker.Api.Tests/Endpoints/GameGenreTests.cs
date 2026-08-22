using System.Net;
using System.Net.Http.Json;
using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Tests.Endpoints;

/// <summary>
/// Choosing which genre stands for a game — the card's colour.
///
/// A property of the title, not of a pass: what kind of game it is does not change between
/// playthroughs the way the platform you played it on does. So it lives on games and gets its
/// own small endpoint rather than riding along with a log entry.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class GameGenreTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Choosing_a_genre_stores_it_and_answers_with_the_game()
    {
        var mediaId = await GivenGameWithGenresAsync("Adventure", "Indie", "Platform");

        var detail = await ReadAsync<GameDetailDto>(await SetGenreAsync(mediaId, "Adventure"));

        detail.PrimaryGenre.ShouldBe("Adventure");
        (await GenreOfAsync(mediaId)).ShouldBe("Adventure");
    }

    [Fact]
    public async Task Clearing_the_choice_goes_back_to_the_automatic_pick()
    {
        // Null means "use the automatic one", not "no genre" — which is why this is expressible
        // at all rather than being a value you can only ever replace.
        var mediaId = await GivenGameWithGenresAsync("Adventure", "Platform");
        await SetGenreAsync(mediaId, "Adventure");

        (await SetGenreAsync(mediaId, null)).StatusCode.ShouldBe(HttpStatusCode.OK);

        (await GenreOfAsync(mediaId)).ShouldBeNull();
    }

    [Fact]
    public async Task Accepts_a_genre_the_game_does_not_list()
    {
        // The platform decision, word for word: IGDB's list is theirs to change, and a value
        // that was true when it was chosen has to outlive the list it was chosen from.
        var mediaId = await GivenGameWithGenresAsync("Platform");

        (await SetGenreAsync(mediaId, "Metroidvania")).StatusCode.ShouldBe(HttpStatusCode.OK);

        (await GenreOfAsync(mediaId)).ShouldBe("Metroidvania");
    }

    [Fact]
    public async Task Rejects_a_genre_longer_than_the_column()
    {
        var mediaId = await GivenGameWithGenresAsync("Platform");

        var response = await SetGenreAsync(mediaId, new string('x', 51));

        response.StatusCode.ShouldBe(HttpStatusCode.BadRequest);
        (await GenreOfAsync(mediaId)).ShouldBeNull();
    }

    [Fact]
    public async Task Choosing_a_genre_for_a_game_that_does_not_exist_is_a_404()
    {
        (await SetGenreAsync(999_999, "Platform")).StatusCode.ShouldBe(HttpStatusCode.NotFound);
    }

    private Task<HttpResponseMessage> SetGenreAsync(int mediaId, string? genre) =>
        Client.PutAsJsonAsync(
            $"/api/games/{mediaId}/genre", new SetGenreRequest(genre), Json, Ct);

    private Task<string?> GenreOfAsync(int mediaId) => WithDbAsync(db => db.Games
        .Where(game => game.Id == mediaId)
        .Select(game => game.PrimaryGenre)
        .SingleAsync(Ct));

    private async Task<int> GivenGameWithGenresAsync(params string[] genres)
    {
        var mediaId = await GivenGameAsync("Hollow Knight");

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(g => g.Id == mediaId, Ct);
            game.Genres = [.. genres];
            await db.SaveChangesAsync(Ct);
        });

        return mediaId;
    }
}
