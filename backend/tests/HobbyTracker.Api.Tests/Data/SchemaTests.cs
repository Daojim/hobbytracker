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
            db.LogEntries.Add(new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.Completed, Rating = rating });
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
            db.LogEntries.Add(new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.Completed, Rating = rating });
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
            db.LogEntries.Add(new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.Completed, Rating = 8.75m });
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
                UserId = UserId,
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
            db.LogEntries.Add(new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.Backlog });
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
            var entry = new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.InProgress };
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
            var entry = new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.InProgress };
            entry.Notes.Add(new Note { Body = new string('x', 4001) });

            db.LogEntries.Add(entry);
            await db.SaveChangesAsync(Ct);
        }));
    }

    [Fact]
    public async Task Media_can_exist_without_a_detail_table()
    {
        // TPT means a media row is free to have no detail row at all. It used to say "which is
        // what a movie will be", and then "books, or tv" — films and TV both have tables of
        // their own now, so what is left is books, music, or anything else whose phase has
        // not come. Under TPH it could not be expressed at all.
        await WithDbAsync(async db =>
        {
            db.Media.Add(new Media
            {
                HobbyId = SeedData.Hobbies.Books,
                SourceId = SeedData.Sources.Manual,
                Title = "Some Book",
            });
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Movies.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.TvShows.CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task Status_is_stored_as_readable_text()
    {
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry { UserId = UserId, MediaId = mediaId, Status = LogStatus.InProgress });
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

    [Fact]
    public async Task Stores_all_three_howlongtobeat_times_against_a_game()
    {
        var mediaId = await GivenAGameAsync();

        await WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            game.HltbMainStoryHours = 27.0m;
            game.HltbMainExtraHours = 41.59m;
            game.HltbCompletionistHours = 65.6m;
            game.HltbId = 26286;
            game.HltbCheckedAt = Eastern(2026, 8, 22);
            await db.SaveChangesAsync(Ct);
        });

        var stored = await WithDbAsync(db => db.Games.SingleAsync(g => g.Id == mediaId, Ct));

        stored.HltbMainStoryHours.ShouldBe(27.0m);
        stored.HltbMainExtraHours.ShouldBe(41.59m);
        stored.HltbCompletionistHours.ShouldBe(65.6m);
        stored.HltbId.ShouldBe(26286);
        stored.HltbCheckedAt.ShouldNotBeNull();
    }

    [Theory]
    [InlineData("main")]
    [InlineData("extra")]
    [InlineData("completionist")]
    public async Task Rejects_a_completion_time_of_nought(string tier)
    {
        // HowLongToBeat answers 0 for "nobody has submitted this", which is not the same claim
        // as "this takes no time". The constraint is what stops that zero being stored as a
        // fact — the client has to map it to null before it ever reaches here.
        var mediaId = await GivenAGameAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var game = await db.Games.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            switch (tier)
            {
                case "main": game.HltbMainStoryHours = 0m; break;
                case "extra": game.HltbMainExtraHours = 0m; break;
                default: game.HltbCompletionistHours = 0m; break;
            }

            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_games_hltb_hours_positive");
    }

    [Fact]
    public async Task A_movie_is_a_table_of_its_own_beside_games()
    {
        // The whole of what Table-Per-Type buys, finally spent: one media row, one movies row,
        // and nothing at all in games. Under TPH both hobbies' columns would sit on `media` with
        // most of them null on every row, and this test could not be written.
        await WithDbAsync(async db =>
        {
            db.Movies.Add(new Movie
            {
                HobbyId = SeedData.Hobbies.Movies,
                SourceId = SeedData.Sources.Tmdb,
                ExternalId = "329865",
                Title = "Arrival",
                ReleaseYear = 2016,
                RuntimeMinutes = 116,
                Genres = ["Drama", "Science Fiction"],
                Directors = ["Denis Villeneuve"],
            });

            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Movies.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);

        var movie = await WithDbAsync(db => db.Movies.SingleAsync(Ct));
        movie.Genres.ShouldBe(["Drama", "Science Fiction"]);
        movie.Directors.ShouldBe(["Denis Villeneuve"]);
    }

    [Fact]
    public async Task Rejects_a_runtime_of_nought()
    {
        // TMDB answers 0 for a film whose runtime nobody has filled in, which is a different
        // claim from "takes no time" — the same distinction the HowLongToBeat hours draw, and
        // the same reason to make forgetting to map it fail loudly rather than store a lie.
        var mediaId = await GivenAMovieAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var movie = await db.Movies.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            movie.RuntimeMinutes = 0;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_movies_runtime_positive");
    }

    [Fact]
    public async Task The_same_external_id_under_two_sources_is_two_titles()
    {
        // The unique index is on (source_id, external_id), not on external_id alone, and this is
        // the day that starts to matter: IGDB's game 550 and TMDB's film 550 are both real and
        // have nothing to do with each other.
        await GivenAGameAsync(externalId: "550");
        await GivenAMovieAsync(externalId: "550");

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task A_show_is_a_table_of_its_own_beside_games_and_movies()
    {
        // The third detail table, and the one that says Table-Per-Type was the right call rather
        // than a lucky one: `tv_shows` carries columns no film has any use for, and `movies` and
        // `games` are untouched by them. Under TPH all three hobbies' columns would sit on
        // `media` with most of them null on every row, and this test could not be written.
        await WithDbAsync(async db =>
        {
            db.TvShows.Add(new TvShow
            {
                HobbyId = SeedData.Hobbies.Tv,
                SourceId = SeedData.Sources.TmdbTv,
                ExternalId = "1396",
                Title = "Breaking Bad",
                FirstAirYear = 2008,
                LastAirYear = 2013,
                AirStatus = "Ended",
                NumberOfSeasons = 5,
                NumberOfEpisodes = 62,
                EpisodeRuntimeMinutes = 45,
                Genres = ["Crime", "Drama"],
                Creators = ["Vince Gilligan"],
            });

            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.TvShows.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Movies.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);

        var show = await WithDbAsync(db => db.TvShows.SingleAsync(Ct));
        show.Genres.ShouldBe(["Crime", "Drama"]);
        show.Creators.ShouldBe(["Vince Gilligan"]);
        show.AirStatus.ShouldBe("Ended");
    }

    [Fact]
    public async Task A_shows_total_runtime_is_multiplied_by_the_database()
    {
        // The whole run is a generated column, so nothing in the application ever writes it and
        // it cannot drift from the two numbers it comes from. Three places read it — both of
        // LibraryService's terminal projections and its Length sort arm — and none of them
        // repeats the arithmetic.
        var mediaId = await GivenAShowAsync(episodes: 62, episodeRuntime: 45);

        var show = await WithDbAsync(db => db.TvShows.SingleAsync(candidate => candidate.Id == mediaId, Ct));

        show.TotalRuntimeMinutes.ShouldBe(2790);
    }

    [Fact]
    public async Task A_show_nobody_timed_has_no_total_runtime_rather_than_nought()
    {
        // Null propagates through the multiplication for free, which is the other half of why
        // this is the database's sum: a show with no episode runtime sorts last under
        // sort=length rather than as though it took no time at all.
        var mediaId = await GivenAShowAsync(episodes: 12, episodeRuntime: null);

        var show = await WithDbAsync(db => db.TvShows.SingleAsync(candidate => candidate.Id == mediaId, Ct));

        show.TotalRuntimeMinutes.ShouldBeNull();
    }

    [Fact]
    public async Task Rejects_an_episode_runtime_of_nought()
    {
        // TMDB's answer for a show nobody has timed, and the same lie a film's runtime of 0
        // would be. Loud rather than quiet, because a card would otherwise print nought hours
        // for a show with sixty-two episodes in it.
        var mediaId = await GivenAShowAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var show = await db.TvShows.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            show.EpisodeRuntimeMinutes = 0;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_tv_shows_episode_runtime_positive");
    }

    [Fact]
    public async Task Rejects_a_show_that_stopped_airing_before_it_started()
    {
        var mediaId = await GivenAShowAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var show = await db.TvShows.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            show.FirstAirYear = 2013;
            show.LastAirYear = 2008;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_tv_shows_year_span");
    }

    [Fact]
    public async Task A_shows_seasons_each_carry_their_own_episode_count()
    {
        // What the journal's two dropdowns are built on: pick a season and the episode list that
        // follows is that season's real length. Breaking Bad's are uneven on purpose here — 7
        // then 13 — because equal ones would let a dropdown that ignored the season pass.
        var mediaId = await GivenAShowAsync(seasons:
        [
            (0, 8, "Specials"),
            (1, 7, "Season 1"),
            (2, 13, "Season 2"),
        ]);

        var seasons = await WithDbAsync(db => db.TvShows
            .Where(show => show.Id == mediaId)
            .SelectMany(show => show.Seasons)
            .OrderBy(season => season.SeasonNumber)
            .ToListAsync(Ct));

        seasons.Select(season => season.SeasonNumber).ShouldBe([0, 1, 2]);
        seasons.Select(season => season.EpisodeCount).ShouldBe([8, 7, 13]);
        seasons[0].Name.ShouldBe("Specials");
    }

    [Fact]
    public async Task Rejects_a_second_row_for_one_season_of_one_show()
    {
        // The key is (media_id, season_number) rather than a surrogate id, so a show cannot have
        // two season 3s — the database refuses it rather than the refresh code having to
        // remember not to write it.
        var mediaId = await GivenAShowAsync(seasons: [(1, 7, "Season 1")]);

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.Add(new TvSeason { MediaId = mediaId, SeasonNumber = 1, EpisodeCount = 99 });
            await db.SaveChangesAsync(Ct);
        }));

        exception.InnerException.ShouldBeOfType<PostgresException>()
            .SqlState.ShouldBe(PostgresErrorCodes.UniqueViolation);
    }

    [Fact]
    public async Task Rejects_a_negative_season_number()
    {
        // Nought is Specials and is allowed; below that there is nothing to mean.
        var mediaId = await GivenAShowAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.Add(new TvSeason { MediaId = mediaId, SeasonNumber = -1, EpisodeCount = 3 });
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_tv_seasons_season_number");
    }

    [Fact]
    public async Task Deleting_a_show_takes_its_seasons_with_it()
    {
        var mediaId = await GivenAShowAsync(seasons: [(1, 7, "Season 1"), (2, 13, "Season 2")]);

        await WithDbAsync(async db =>
        {
            var media = await db.Media.SingleAsync(candidate => candidate.Id == mediaId, Ct);
            db.Media.Remove(media);
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.TvShows.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Set<TvSeason>().CountAsync(Ct))).ShouldBe(0);
    }

    [Fact]
    public async Task The_same_tmdb_id_as_a_film_and_as_a_show_is_two_titles()
    {
        // The reason TV gets a source row of its own rather than riding on `tmdb`. TMDB numbers
        // films and shows in separate sequences, so 1396 names a film *and* Breaking Bad. Under
        // one source row the unique index on (source_id, external_id) makes them one row — and
        // the upsert would not even report it, because its 23505 recovery re-reads and hands
        // back whichever got there first. A show that is silently a film.
        await GivenAMovieAsync(externalId: "1396");
        await GivenAShowAsync(externalId: "1396");

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    [Fact]
    public async Task A_pass_records_where_you_are()
    {
        // The one idea TV adds that neither games nor films had: a show is something you are
        // partway through. It lives on the pass rather than on the show because it is a fact
        // about this watch of it — a rewatch starts again — which is the same argument that puts
        // hours_played and platform here.
        var mediaId = await GivenAShowAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = 3,
                EpisodeNumber = 7,
            });
            await db.SaveChangesAsync(Ct);
        });

        var entry = await WithDbAsync(db => db.LogEntries.SingleAsync(Ct));
        entry.SeasonNumber.ShouldBe(3);
        entry.EpisodeNumber.ShouldBe(7);
    }

    [Fact]
    public async Task Accepts_season_nought_because_that_is_specials()
    {
        // TMDB numbers a show's specials as season 0, and tv_seasons stores them as a real
        // season, so a pass has to be able to point at one. This is why the constraint is >= 0
        // rather than the >= 1 that reads more naturally.
        var mediaId = await GivenAShowAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = 0,
                EpisodeNumber = 4,
            });
            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.LogEntries.SingleAsync(Ct))).SeasonNumber.ShouldBe(0);
    }

    [Fact]
    public async Task Rejects_a_negative_season()
    {
        var mediaId = await GivenAShowAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = -1,
            });
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_log_entries_season_range");
    }

    [Fact]
    public async Task Rejects_an_episode_of_nought()
    {
        // Unlike a season, where nought is Specials, there is no episode zero to mean.
        var mediaId = await GivenAShowAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = 1,
                EpisodeNumber = 0,
            });
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_log_entries_episode_range");
    }

    [Fact]
    public async Task Accepts_an_episode_with_no_season_to_be_in()
    {
        // `ck_log_entries_episode_needs_season` used to live here, on the argument that
        // "episode 7" says nothing without a season. That was true of every hobby that existed
        // when it was written and **it is false for anime**: MAL numbers each cour as its own
        // entry, so the cour *is* the title and episode 7 says everything there is to say.
        //
        // The rule now lives in each hobby's form, which is where the other half of it always
        // lived: television's episode dropdown is built from the chosen season's episode count
        // and is empty until one is picked, so a show still cannot record the pair backwards.
        // The precedent is in the constraint's own former comment, which declined to bound an
        // episode against the show's counts because a value true when it was written must
        // outlive the shape it came from.
        var mediaId = await GivenAShowAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = null,
                EpisodeNumber = 7,
            });
            await db.SaveChangesAsync(Ct);
        });

        var entry = await WithDbAsync(db => db.LogEntries.SingleAsync(Ct));
        entry.SeasonNumber.ShouldBeNull();
        entry.EpisodeNumber.ShouldBe(7);
    }

    [Fact]
    public async Task Accepts_a_season_with_no_episode_named_yet()
    {
        var mediaId = await GivenAShowAsync();

        await WithDbAsync(async db =>
        {
            db.LogEntries.Add(new LogEntry
            {
                UserId = UserId,
                MediaId = mediaId,
                Status = LogStatus.InProgress,
                SeasonNumber = 2,
                EpisodeNumber = null,
            });
            await db.SaveChangesAsync(Ct);
        });

        var entry = await WithDbAsync(db => db.LogEntries.SingleAsync(Ct));
        entry.SeasonNumber.ShouldBe(2);
        entry.EpisodeNumber.ShouldBeNull();
    }

    [Fact]
    public async Task An_anime_is_a_table_of_its_own_beside_the_other_three()
    {
        // The fourth detail table, and the one with the fewest columns in common with the one
        // it most resembles: an anime and a show are both episodic, and `anime` carries a second
        // title, a source material, a studio and a mean score that `tv_shows` has no idea of —
        // while having no seasons table at all, because MAL numbers each cour as its own entry.
        await WithDbAsync(async db =>
        {
            db.Anime.Add(new Anime
            {
                HobbyId = SeedData.Hobbies.Anime,
                SourceId = SeedData.Sources.Mal,
                ExternalId = "52991",
                Title = "Sousou no Frieren",
                EnglishTitle = "Frieren: Beyond Journey's End",
                MediaType = "tv",
                EpisodeCount = 28,
                EpisodeRuntimeSeconds = 1470,
                StartSeason = "fall",
                StartYear = 2023,
                AirStatus = "finished_airing",
                SourceMaterial = "manga",
                Genres = ["Adventure", "Drama", "Fantasy"],
                Studios = ["Madhouse"],
                MeanScore = 9.25m,
            });

            await db.SaveChangesAsync(Ct);
        });

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.Anime.CountAsync(Ct))).ShouldBe(1);
        (await WithDbAsync(db => db.TvShows.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Movies.CountAsync(Ct))).ShouldBe(0);
        (await WithDbAsync(db => db.Games.CountAsync(Ct))).ShouldBe(0);

        var anime = await WithDbAsync(db => db.Anime.SingleAsync(Ct));
        anime.EnglishTitle.ShouldBe("Frieren: Beyond Journey's End");
        anime.Genres.ShouldBe(["Adventure", "Drama", "Fantasy"]);
        anime.Studios.ShouldBe(["Madhouse"]);
        anime.SourceMaterial.ShouldBe("manga");
        anime.MeanScore.ShouldBe(9.25m);
    }

    [Fact]
    public async Task An_animes_total_runtime_is_multiplied_and_converted_by_the_database()
    {
        // MAL states one episode in *seconds*, and the column it becomes is minutes — so this
        // sum has a unit conversion in it that `tv_shows`'s does not. Doing it in Postgres is
        // what keeps the factor of sixty in exactly one place: three readers in LibraryService
        // would otherwise each need it, and getting one of them wrong is a runtime sixty times
        // out on a card nobody would think to check.
        //
        // Frieren: 28 episodes of 1470 seconds is 41160 seconds, which is 686 minutes.
        var mediaId = await GivenAnAnimeAsync(episodes: 28, episodeRuntimeSeconds: 1470);

        var anime = await WithDbAsync(db => db.Anime.SingleAsync(one => one.Id == mediaId, Ct));

        anime.TotalRuntimeMinutes.ShouldBe(686);
    }

    [Fact]
    public async Task An_anime_nobody_timed_has_no_total_runtime_rather_than_nought()
    {
        // Null propagates through the product for free, exactly as it does for a show, and the
        // untimed then sort last under sort=length rather than as though they took no time.
        var mediaId = await GivenAnAnimeAsync(episodes: 12, episodeRuntimeSeconds: null);

        var anime = await WithDbAsync(db => db.Anime.SingleAsync(one => one.Id == mediaId, Ct));

        anime.TotalRuntimeMinutes.ShouldBeNull();
    }

    [Fact]
    public async Task Rejects_an_episode_count_of_nought()
    {
        // **MAL answers 0 for an unaired entry**, and it means unknown rather than none — a cour
        // airing next year is the ordinary case for it. Nought stored here would make a card
        // claim a season with no episodes in it, so the mapping to null is a rule the database
        // holds rather than a habit the catalog service is trusted to keep.
        var mediaId = await GivenAnAnimeAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var anime = await db.Anime.SingleAsync(one => one.Id == mediaId, Ct);
            anime.EpisodeCount = 0;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_anime_counts_positive");
    }

    [Fact]
    public async Task Rejects_an_episode_runtime_of_nought_seconds()
    {
        var mediaId = await GivenAnAnimeAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var anime = await db.Anime.SingleAsync(one => one.Id == mediaId, Ct);
            anime.EpisodeRuntimeSeconds = 0;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_anime_counts_positive");
    }

    [Fact]
    public async Task Rejects_a_mean_score_outside_the_scale_it_is_read_on()
    {
        // MAL scores out of ten, as this app's own ratings do — so a figure outside that range
        // is a mapping fault rather than a strong opinion, and the drawer would print it beside
        // a rating on the same scale.
        var mediaId = await GivenAnAnimeAsync();

        var exception = await Should.ThrowAsync<DbUpdateException>(WithDbAsync(async db =>
        {
            var anime = await db.Anime.SingleAsync(one => one.Id == mediaId, Ct);
            anime.MeanScore = 12.5m;
            await db.SaveChangesAsync(Ct);
        }));

        ShouldBeCheckViolation(exception, "ck_anime_mean_score_range");
    }

    [Fact]
    public async Task The_same_id_at_mal_and_at_tmdb_is_two_titles()
    {
        // The reason `mal` is a source row of its own rather than a reuse of one. MAL numbers
        // its catalogue independently of TMDB's two sequences, so anime 1 and film 1 both exist
        // — and under one shared source they would collide on ix_media_source_id_external_id,
        // where UpsertAsync's 23505 recovery re-reads and hands back whichever got there first.
        // An anime silently being a film, with nothing erroring.
        await GivenMovieAsync(title: "Cowboy Bebop: The Movie", externalId: "1");
        await GivenAnAnimeAsync(externalId: "1");

        (await WithDbAsync(db => db.Media.CountAsync(Ct))).ShouldBe(2);
    }

    private async Task<int> GivenAnAnimeAsync(
        string externalId = "1",
        int? episodes = null,
        int? episodeRuntimeSeconds = null)
    {
        return await WithDbAsync(async db =>
        {
            var anime = new Anime
            {
                HobbyId = SeedData.Hobbies.Anime,
                SourceId = SeedData.Sources.Mal,
                ExternalId = externalId,
                Title = $"Anime {externalId}",
                EpisodeCount = episodes,
                EpisodeRuntimeSeconds = episodeRuntimeSeconds,
            };

            db.Anime.Add(anime);
            await db.SaveChangesAsync(Ct);
            return anime.Id;
        });
    }

    private async Task<int> GivenAShowAsync(
        string externalId = "1",
        int? episodes = null,
        int? episodeRuntime = null,
        (int Number, int Episodes, string? Name)[]? seasons = null)
    {
        return await WithDbAsync(async db =>
        {
            var show = new TvShow
            {
                HobbyId = SeedData.Hobbies.Tv,
                SourceId = SeedData.Sources.TmdbTv,
                ExternalId = externalId,
                Title = $"Show {externalId}",
                NumberOfEpisodes = episodes,
                EpisodeRuntimeMinutes = episodeRuntime,
                Seasons =
                [
                    .. (seasons ?? []).Select(season => new TvSeason
                    {
                        SeasonNumber = season.Number,
                        EpisodeCount = season.Episodes,
                        Name = season.Name,
                    }),
                ],
            };

            db.TvShows.Add(show);
            await db.SaveChangesAsync(Ct);
            return show.Id;
        });
    }


    private async Task<int> GivenAMovieAsync(string externalId = "1")
    {
        return await WithDbAsync(async db =>
        {
            var movie = new Movie
            {
                HobbyId = SeedData.Hobbies.Movies,
                SourceId = SeedData.Sources.Tmdb,
                ExternalId = externalId,
                Title = $"Film {externalId}",
            };

            db.Movies.Add(movie);
            await db.SaveChangesAsync(Ct);
            return movie.Id;
        });
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
