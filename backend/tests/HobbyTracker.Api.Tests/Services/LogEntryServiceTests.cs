using HobbyTracker.Api.Contracts;
using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Services;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HobbyTracker.Api.Tests.Services;

/// <summary>
/// Putting a title on the board, and telling whoever wants to know.
///
/// Adding is the one gesture that should fetch a title's metadata without anybody running
/// maintenance, and each hobby fetches something different — HowLongToBeat's estimates for a
/// game, TMDB's runtime and director for a film. So the service announces and does not decide:
/// it knows that something was added, never what should happen next.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class LogEntryServiceTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Fact]
    public async Task Tells_every_handler_that_a_title_reached_the_board()
    {
        var mediaId = await GivenGameAsync("Hollow Knight");
        var first = new RecordingHandler();
        var second = new RecordingHandler();

        await CreateAsync(mediaId, first, second);

        // Both, not the first one that answers. A title is a game and a film to nobody, but the
        // dispatch cannot know that, and a handler skipped because an earlier one said something
        // would be a hobby ordering itself ahead of the others by accident.
        first.Added.ShouldHaveSingleItem().Id.ShouldBe(mediaId);
        second.Added.ShouldHaveSingleItem().Id.ShouldBe(mediaId);
    }

    [Fact]
    public async Task Hands_a_handler_the_title_rather_than_its_id()
    {
        // The whole row, so a handler for one hobby can decline a title belonging to another
        // without a query. `hobby_id` is redundant under TPT and kept for exactly this kind of
        // question.
        var mediaId = await GivenGameAsync("Celeste");
        var handler = new RecordingHandler();

        await CreateAsync(mediaId, handler);

        var media = handler.Added.ShouldHaveSingleItem();
        media.Title.ShouldBe("Celeste");
        media.HobbyId.ShouldBe(SeedData.Hobbies.Games);
    }

    [Fact]
    public async Task A_handler_that_throws_does_not_lose_the_pass()
    {
        // The pass is yours; the metadata belongs to somebody else's website. Letting a failed
        // lookup take the write with it would mean an outage at IGDB, TMDB or HowLongToBeat
        // stopping you writing in your own journal.
        var mediaId = await GivenGameAsync("Outer Wilds");
        var throwing = new ThrowingHandler();
        var after = new RecordingHandler();

        var created = await CreateAsync(mediaId, throwing, after);

        created.ShouldNotBeNull();
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(1);

        // And the ones behind it still hear about it: one broken handler is not the others'
        // problem, and which order they were registered in is not something to depend on.
        after.Added.ShouldHaveSingleItem().Id.ShouldBe(mediaId);
    }

    [Fact]
    public async Task Says_nothing_about_a_title_that_does_not_exist()
    {
        var handler = new RecordingHandler();

        (await CreateAsync(mediaId: 9999, handler)).ShouldBeNull();

        handler.Added.ShouldBeEmpty();
    }

    private async Task<LogEntryDto?> CreateAsync(int mediaId, params IMediaAdded[] handlers)
    {
        await using var db = Postgres.CreateDbContext();

        var service = new LogEntryService(
            db,
            Journal,
            handlers,
            NullLogger<LogEntryService>.Instance,
            new FakeCurrentUser(UserId));

        return await service.CreateAsync(
            new CreateLogEntryRequest(mediaId, LogStatus.Backlog, null, null, null, null, null),
            Ct);
    }

    private sealed class RecordingHandler : IMediaAdded
    {
        public List<Media> Added { get; } = [];

        public Task OnAddedAsync(Media media, CancellationToken cancellationToken)
        {
            Added.Add(media);
            return Task.CompletedTask;
        }
    }

    private sealed class ThrowingHandler : IMediaAdded
    {
        public Task OnAddedAsync(Media media, CancellationToken cancellationToken) =>
            throw new InvalidOperationException("the upstream provider is having a day");
    }
}
