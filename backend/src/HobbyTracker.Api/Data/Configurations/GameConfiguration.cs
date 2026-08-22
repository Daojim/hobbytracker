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

            // HowLongToBeat answers 0 for a game nobody has submitted a time for, which is a
            // different claim from "takes no time". Mapping that 0 to null is the client's job;
            // this is what makes forgetting to do it fail loudly instead of storing a lie.
            //
            // No upper bound here on purpose: numeric(5,2) *throws* past 999.99 rather than
            // rounding, so an over-long completionist time — and they exist — has to be dropped
            // to null before the insert, where a constraint could not help anyway.
            table.HasCheckConstraint(
                "ck_games_hltb_hours_positive",
                """
                (hltb_main_story_hours    IS NULL OR hltb_main_story_hours    > 0) AND
                (hltb_main_extra_hours    IS NULL OR hltb_main_extra_hours    > 0) AND
                (hltb_completionist_hours IS NULL OR hltb_completionist_hours > 0)
                """);
        });

        // Native Postgres arrays. Npgsql maps List<string> to text[] with no converter and
        // no join table, and supplies the value comparer EF needs to detect edits.
        builder.Property(g => g.Platforms).HasColumnType("text[]");
        builder.Property(g => g.Developers).HasColumnType("text[]");
        builder.Property(g => g.Genres).HasColumnType("text[]");

        // Free text, not a value constrained to the array beside it. See Game.PrimaryGenre.
        builder.Property(g => g.PrimaryGenre).HasMaxLength(50);

        // Up to 999.99 hours, to the nearest hundredth — the same shape as
        // log_entries.hours_played, which is the number these get read against.
        builder.Property(g => g.HltbMainStoryHours).HasPrecision(5, 2);
        builder.Property(g => g.HltbMainExtraHours).HasPrecision(5, 2);
        builder.Property(g => g.HltbCompletionistHours).HasPrecision(5, 2);
    }
}
