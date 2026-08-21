using HobbyTracker.Api.Data;
using HobbyTracker.Api.Domain;
using HobbyTracker.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HobbyTracker.Api.Tests.Data;

/// <summary>
/// Asserts the database itself enforces what the schema claims. These are the guarantees the
/// application code is allowed to rely on — if a check constraint silently stops being
/// created, every layer above it starts trusting something that is no longer true.
/// </summary>
[Collection(DatabaseCollection.Name)]
public sealed class SchemaTests(PostgresFixture postgres) : DatabaseTestBase(postgres)
{
    [Theory]
    [InlineData(1.0)]
    [InlineData(8.5)]
    [InlineData(10.0)]
    public async Task Accepts_ratings_inside_the_scale(decimal rating)
    {
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { MediaId = mediaId, Status = LogStatus.Completed, Rating = rating });
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(1);
    }

    [Theory]
    [InlineData(0.5)]
    [InlineData(10.5)]
    [InlineData(-1)]
    public async Task Rejects_ratings_outside_the_scale(decimal rating)
    {
        var mediaId = await GivenAGameAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { MediaId = mediaId, Status = LogStatus.Completed, Rating = rating });
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_log_entries_rating_range");
    }

    [Fact]
    public async Task Silently_rounds_a_rating_with_two_decimal_places()
    {
        // Documenting a real hazard rather than asserting desired behaviour: numeric(3,1)
        // rounds rather than rejecting, so an API that accepted 8.75 would echo 8.75 while the
        // database held 8.8. This is why validation has to catch it before the insert.
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { MediaId = mediaId, Status = LogStatus.Completed, Rating = 8.75m });
            await db.SaveChangesAsync(Ct);
        });

        var stored = await WithDbAsync(db => db.LogEntries.Select(e => e.Rating).SingleAsync(Ct));
        stored.ShouldBe(8.8m);
    }

    [Fact]
    public async Task Rejects_a_completion_that_precedes_its_own_start()
    {
        var mediaId = await GivenAGameAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                MediaId = mediaId,
                Status = LogStatus.Completed,
                StartedAt = Eastern(2026, 8, 20),
                CompletedAt = Eastern(2026, 7, 1),
            });
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_log_entries_timestamp_order");
    }

    [Fact]
    public async Task Rejects_the_same_external_id_twice_for_one_source()
    {
        await GivenAGameAsync(externalId: "740");

        var exception = await Should.ThrowAsync<DbUpdateException>(GivenAGameAsync(externalId: "740"));

        // This index is what makes the IGDB upsert idempotent. Without it, searching twice
        // duplicates every result.
        exception.InnerException.ShouldBeOfType<PostgresException>()
            .SqlState.ShouldBe(PostgresErrorCodes.UniqueViolation);
    }

    [Fact]
    public async Task Allows_many_manual_entries_with_no_external_id()
    {
        // The unique index is filtered to external_id IS NOT NULL precisely so hand-entered
        // titles, which have no source id, can coexist.
        await WithDbAsync(async db =>
        {
            db.Media.AddRange(
                new Media { HobbyId = SeedData.Hobbies.Books, SourceId = SeedData.Sources.Manual, Title = "One" },
                new Media { HobbyId = SeedData.Hobbies.Books, SourceId = SeedData.Sources.Manual, Title = "Two" },
                new Media { HobbyId = SeedData.Hobbies.Books, SourceId = SeedData.Sources.Manual, Title = "Three" });
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(3);
    }

    [Fact]
    public async Task Deleting_media_removes_its_game_detail_and_log_entries()
    {
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { MediaId = mediaId, Status = LogStatus.Backlog });
            await db.SaveChangesAsync(Ct);
        });

        await WithDbAsync(async db =>
        {
            db.Media.Remove(await db.Media.SingleAsync(m => m.Id == mediaId, Ct));
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.LogEntries.CountAsync(Ct))).ShouldBe(0);
    }


    [Fact]
    public async Task Deleting_a_log_entry_removes_its_notes_and_leaves_the_title_alone()
    {
        // A note belongs to the pass it was written during. Un-logging a pass should take its
        // notes with it — and should not take the title out of the catalog.
        var mediaId = await GivenAGameAsync();

        var entryId = await WithDbAsync(async db =>
        {
            var entry = new LogEntry { MediaId = mediaId, Status = LogStatus.InProgress };
            entry.Notes.Add(new Note { Body = "stuck on watcher knights" });
            entry.Notes.Add(new Note { Body = "finally beat radiance" });

            db.LogEntries.Add(entry);
            await db.SaveChangesAsync(Ct);
            return entry.Id;
        });

        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(2);

        await WithDbAsync(async db =>
        {
            db.LogEntries.Remove(await db.LogEntries.SingleAsync(e => e.Id == entryId, Ct));
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Notes.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
    }

    [Fact]
    public async Task Rejects_a_note_longer_than_the_column()
    {
        var mediaId = await GivenAGameAsync();

        await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var entry = new LogEntry { MediaId = mediaId, Status = LogStatus.InProgress };
            entry.Notes.Add(new Note { Body = new string('x', 4001) });

            db.LogEntries.Add(entry);
            await db.SaveChangesAsync(Ct);
        }));
    }
    [Fact]
    public async Task Media_can_exist_without_game_detail()
    {
        // TPT means a media row is free to have no games row -- which is what a movie will be.
        // Under TPH this would be impossible to express.
        await WithDbAsync(async db =>
        {
            db.Media.Add(new Media
            {
                HobbyId = SeedData.Hobbies.Movies,
                SourceId = SeedData.Sources.Manual,
                Title = "Some Film",
            });
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task Status_is_stored_as_readable_text()
    {
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { MediaId = mediaId, Status = LogStatus.InProgress });
            await db.SaveChangesAsync(Ct);
        });

        var stored = await WithDbAsync(async db =>
        {
            await db.Database.OpenConnectionAsync(Ct);
            await using var command = db.Database.GetDbConnection().CreateCommand();
            command.CommandText = "select status from log_entries limit 1";
            return (string?)await command.ExecuteScalarAsync(Ct);
        });

        // An int ordinal here would mean reordering LogStatus silently rewrites history.
        stored.ShouldBe("InProgress");
    }

    private async Task<int> GivenAGameAsync(string externalId = "1")
    {
        return await WithDbAsync(async db =>
        {
            var game = new Game
            {
                HobbyId = SeedData.Hobbies.Games,
                SourceId = SeedData.Sources.Igdb,
                ExternalId = externalId,
                Title = $"Game {externalId}",
            };

            db.Games.Add(game);
            await db.SaveChangesAsync(Ct);
            return game.Id;
        });
    }

    private static void ShouldBeCheckViolation(DbUpdateException exception, string constraint)
    {
        var postgres = exception.InnerException.ShouldBeOfType<PostgresException>();
        postgres.SqlState.ShouldBe(PostgresErrorCodes.CheckViolation);
        postgres.ConstraintName.ShouldBe(constraint);
    }
}
