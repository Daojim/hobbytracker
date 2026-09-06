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

        public const string IgdbName = "igdb";
        public const string ManualName = "manual";
        public const string TmdbName = "tmdb";

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
        // definition needs none. `mal` gets seeded when its phase ships — a source row with no
        // client behind it is dead data that reads like a working feature.
        modelBuilder.Entity<Source>().HasData(
            new Source { Id = Sources.Igdb, Name = Sources.IgdbName, BaseUrl = "https://api.igdb.com/v4/" },
            new Source { Id = Sources.Manual, Name = Sources.ManualName, BaseUrl = null },
            new Source { Id = Sources.Tmdb, Name = Sources.TmdbName, BaseUrl = "https://api.themoviedb.org/3/" });
    }
}
