using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Data;

/// <summary>
/// Reference rows baked into the initial migration.
///
/// The ids are fixed constants rather than identity values on purpose. These two tables are
/// closed vocabularies managed by migrations, so their ids are part of the schema contract —
/// which means application code can say <c>SeedData.Sources.Igdb</c> instead of paying for a
/// lookup query on every request just to learn that "igdb" is still 1.
/// </summary>
public static class SeedData
{
    public static class Hobbies
    {
        public const int Games = 1;
        public const int Movies = 2;
        public const int Tv = 3;
        public const int Anime = 4;
        public const int Books = 5;
        public const int Music = 6;
    }

    public static class Sources
    {
        public const int Igdb = 1;
        public const int Manual = 2;
        public const int Tmdb = 3;

        // TMDB twice, and this is the one seeded id that needs its reason written down.
        // TMDB numbers films and shows in *separate sequences*, so 1396 is Breaking Bad
        // and also some unrelated film. media has one unique index on
        // (source_id, external_id), so under a single `tmdb` row those two are one row —
        // and the upsert would not even error, because its 23505 recovery re-reads and
        // hands back whichever got there first. A show that is silently a film.
        //
        // Two rows rather than widening that index, because a source records where a
        // record came from and these genuinely are different places: /movie/ and /tv/.
        public const int TmdbTv = 4;

        // MAL, and the same fact a third time: it numbers its own catalogue independently of
        // both TMDB sequences, so MAL anime 1 and TMDB film 1 would be one row under a shared
        // source. The 23505 recovery would not even error — it re-reads and hands back
        // whichever got there first, so an anime would silently be a film.
        public const int Mal = 5;

        public const string IgdbName = "igdb";
        public const string ManualName = "manual";
        public const string TmdbName = "tmdb";
        public const string TmdbTvName = "tmdb-tv";
        public const string MalName = "mal";

        /// <summary>
        /// Slug for a seeded source id, for shaping API responses without a join.
        ///
        /// A source added below and not here answers "unknown" on every DTO that names it, and
        /// nothing errors — which is why the arm and the row belong in the same commit.
        /// </summary>
        public static string NameFor(int sourceId) => sourceId switch
        {
            Igdb => IgdbName,
            Manual => ManualName,
            Tmdb => TmdbName,
            TmdbTv => TmdbTvName,
            Mal => MalName,
            _ => "unknown",
        };
    }

    public static void Apply(ModelBuilder modelBuilder)
    {
        // All six hobby categories: the taxonomy is fixed and app-owned, so seeding the
        // whole set now costs nothing and keeps ids stable as later phases land.
        modelBuilder.Entity<Hobby>().HasData(
            new Hobby { Id = Hobbies.Games, Name = "games" },
            new Hobby { Id = Hobbies.Movies, Name = "movies" },
            new Hobby { Id = Hobbies.Tv, Name = "tv" },
            new Hobby { Id = Hobbies.Anime, Name = "anime" },
            new Hobby { Id = Hobbies.Books, Name = "books" },
            new Hobby { Id = Hobbies.Music, Name = "music" });

        // Only sources that have an integration behind them, plus "manual", which by
        // definition needs none. A source row with no client behind it is dead data that reads
        // like a working feature, which is why each of these has arrived with its own phase.
        modelBuilder.Entity<Source>().HasData(
            new Source { Id = Sources.Igdb, Name = Sources.IgdbName, BaseUrl = "https://api.igdb.com/v4/" },
            new Source { Id = Sources.Manual, Name = Sources.ManualName, BaseUrl = null },
            new Source { Id = Sources.Tmdb, Name = Sources.TmdbName, BaseUrl = "https://api.themoviedb.org/3/" },
            new Source { Id = Sources.TmdbTv, Name = Sources.TmdbTvName, BaseUrl = "https://api.themoviedb.org/3/tv/" },
            new Source { Id = Sources.Mal, Name = Sources.MalName, BaseUrl = "https://api.myanimelist.net/v2/" });
    }
}
