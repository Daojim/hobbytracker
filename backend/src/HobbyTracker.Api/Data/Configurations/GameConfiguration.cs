using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class GameConfiguration : IEntityTypeConfiguration<Game>
{
    public void Configure(EntityTypeBuilder<Game> builder)
    {
        // Mapping a derived entity to its own table is what selects Table-Per-Type. Without
        // it EF defaults to Table-Per-Hierarchy and would fold every future hobby's columns
        // into `media` behind a discriminator, leaving most of them null on most rows.
        builder.ToTable("games", table =>
        {
            // Under TPT the derived table's primary key doubles as its foreign key to the
            // base table, and the schema calls that column `media_id`.
            //
            // This has to go through the table builder rather than builder.Property(...):
            // Id is declared on Media, so configuring the property directly would rename the
            // column in `media` as well and leave the base table with no `id` at all.
            table.Property(game => game.Id).HasColumnName("media_id");
        });

        // Native Postgres arrays. Npgsql maps List<string> to text[] with no converter and
        // no join table, and supplies the value comparer EF needs to detect edits.
        builder.Property(g => g.Platforms).HasColumnType("text[]");
        builder.Property(g => g.Developers).HasColumnType("text[]");
        builder.Property(g => g.Genres).HasColumnType("text[]");

        // Free text, not a value constrained to the array beside it. See Game.PrimaryGenre.
        builder.Property(g => g.PrimaryGenre).HasMaxLength(50);

        // Up to 999.99 hours, to the nearest hundredth — HLTB reports one decimal place.
        builder.Property(g => g.HltbMainStoryHours).HasPrecision(5, 2);
    }
}
