using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class AnimeConfiguration : IEntityTypeConfiguration<Anime>
{
    public void Configure(EntityTypeBuilder<Anime> builder)
    {
        // Mapping a derived entity to its own table is what selects Table-Per-Type. Without it
        // EF defaults to Table-Per-Hierarchy and would fold every hobby's columns into `media`
        // behind a discriminator, leaving most of them null on most rows. Nothing errors.
        builder.ToTable("anime", table =>
        {
            // Under TPT the derived table's primary key doubles as its foreign key to the base
            // table, and the schema calls that column `media_id`.
            //
            // This has to go through the table builder rather than builder.Property(...): Id is
            // declared on Media, so configuring the property directly would rename the column in
            // `media` as well and leave the base table with no `id` at all.
            table.Property(anime => anime.Id).HasColumnName("media_id");

            // MAL answers 0 for an entry that has not aired yet, and 0 there means *unknown*
            // rather than none — Frieren's 2027 cour is the ordinary case for it. Both figures
            // are guarded by one constraint because both are inputs to the same generated
            // column: a wrong total could only come from a wrong factor, and either nought
            // would make a card claim a cour takes no time.
            table.HasCheckConstraint(
                "ck_anime_counts_positive",
                """
                (episode_count IS NULL OR episode_count > 0)
                AND (episode_runtime_seconds IS NULL OR episode_runtime_seconds > 0)
                """);

            // MAL scores out of ten, which is this app's own scale — so the drawer can print
            // the two beside each other and neither needs a footnote. A figure outside the range
            // is a mapping fault rather than a strong opinion, and this is what says so.
            table.HasCheckConstraint(
                "ck_anime_mean_score_range",
                "mean_score IS NULL OR (mean_score >= 1.0 AND mean_score <= 10.0)");
        });

        // Native Postgres arrays, as the other three detail tables use. Npgsql maps List<string>
        // to text[] with no converter and no join table, and supplies the value comparer EF
        // needs to spot an edit.
        builder.Property(anime => anime.Genres).HasColumnType("text[]");
        builder.Property(anime => anime.Studios).HasColumnType("text[]");

        // The same 500 as `media.title`, because it is the same kind of thing: an English title
        // is a title, and MAL's longest are light-novel adaptations that run to a sentence.
        builder.Property(anime => anime.EnglishTitle).HasMaxLength(500);

        // Same 50 as the other three. It holds one genre name, and MAL's longest of the ones
        // `hobbies/anime.ts` paints is "Slice of Life".
        builder.Property(anime => anime.PrimaryGenre).HasMaxLength(50);

        // MAL's own vocabularies, all three of them short and all three theirs to change.
        builder.Property(anime => anime.MediaType).HasMaxLength(20);
        builder.Property(anime => anime.StartSeason).HasMaxLength(10);
        builder.Property(anime => anime.AirStatus).HasMaxLength(30);
        builder.Property(anime => anime.SourceMaterial).HasMaxLength(30);

        // Out of ten to two places, which is the shape MAL states — 9.25 for Frieren.
        builder.Property(anime => anime.MeanScore).HasPrecision(4, 2);

        // The whole cour, multiplied *and converted* by Postgres rather than by this
        // application. `tv_shows` has the same column and this one has a unit in it: MAL states
        // an episode in seconds and this is minutes, so integer division by sixty happens here,
        // once, rather than in each of LibraryService's three readers. It truncates, which
        // costs at most a minute across a whole cour and cannot be wrong by a factor.
        //
        // `stored` rather than `virtual` because it is read on every board query and written
        // only when a refresh changes one of its inputs. Marking it computed is also what tells
        // EF never to name it in an INSERT or UPDATE — Postgres rejects a write to a generated
        // column outright (42601), so getting this wrong fails loudly on the first search.
        builder.Property(anime => anime.TotalRuntimeMinutes)
            .HasComputedColumnSql("episode_count * episode_runtime_seconds / 60", stored: true);
    }
}
