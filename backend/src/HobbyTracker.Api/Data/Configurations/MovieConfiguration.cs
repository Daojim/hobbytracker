using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class MovieConfiguration : IEntityTypeConfiguration<Movie>
{
    public void Configure(EntityTypeBuilder<Movie> builder)
    {
        // Mapping a derived entity to its own table is what selects Table-Per-Type. Without it
        // EF defaults to Table-Per-Hierarchy and would fold both hobbies' columns into `media`
        // behind a discriminator, leaving most of them null on most rows. Nothing errors.
        builder.ToTable("movies", table =>
        {
            // Under TPT the derived table's primary key doubles as its foreign key to the base
            // table, and the schema calls that column `media_id`.
            //
            // This has to go through the table builder rather than builder.Property(...): Id is
            // declared on Media, so configuring the property directly would rename the column in
            // `media` as well and leave the base table with no `id` at all.
            table.Property(movie => movie.Id).HasColumnName("media_id");

            // TMDB answers 0 for a film whose runtime nobody has filled in, which is not the
            // same claim as "takes no time". The games table draws the same distinction over
            // HowLongToBeat's hours, for the same reason: this is what makes forgetting to map
            // it fail loudly rather than quietly store a lie a card would then print.
            table.HasCheckConstraint(
                "ck_movies_runtime_positive",
                "runtime_minutes IS NULL OR runtime_minutes > 0");
        });

        // Native Postgres arrays, as `games` uses. Npgsql maps List<string> to text[] with no
        // converter and no join table, and supplies the value comparer EF needs to spot an edit.
        builder.Property(m => m.Genres).HasColumnType("text[]");
        builder.Property(m => m.Directors).HasColumnType("text[]");

        // Same 50 as games. It holds one genre name, and TMDB's longest is "Science Fiction".
        builder.Property(m => m.PrimaryGenre).HasMaxLength(50);
    }
}
