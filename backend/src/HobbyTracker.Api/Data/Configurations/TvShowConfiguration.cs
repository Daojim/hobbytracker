using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class TvShowConfiguration : IEntityTypeConfiguration<TvShow>
{
    public void Configure(EntityTypeBuilder<TvShow> builder)
    {
        // Mapping a derived entity to its own table is what selects Table-Per-Type. Without it
        // EF defaults to Table-Per-Hierarchy and would fold all three hobbies' columns into
        // `media` behind a discriminator, leaving most of them null on most rows. Nothing errors.
        builder.ToTable("tv_shows", table =>
        {
            // Under TPT the derived table's primary key doubles as its foreign key to the base
            // table, and the schema calls that column `media_id`.
            //
            // This has to go through the table builder rather than builder.Property(...): Id is
            // declared on Media, so configuring the property directly would rename the column in
            // `media` as well and leave the base table with no `id` at all.
            table.Property(show => show.Id).HasColumnName("media_id");

            // TMDB answers 0 for a show nobody has timed, which is not the same claim as "takes
            // no time" — `movies` and `games` both draw this distinction and this is the third.
            // It guards the per-episode figure rather than the total, because the total is
            // generated from it: a wrong total could only come from a wrong episode length.
            table.HasCheckConstraint(
                "ck_tv_shows_episode_runtime_positive",
                "episode_runtime_minutes IS NULL OR episode_runtime_minutes > 0");

            // A show with no seasons is not a show, and a season count of nought would make the
            // journal's dropdown empty on a title the board is happy to display.
            table.HasCheckConstraint(
                "ck_tv_shows_counts_positive",
                """
                (number_of_seasons IS NULL OR number_of_seasons > 0)
                AND (number_of_episodes IS NULL OR number_of_episodes > 0)
                """);

            // A show cannot stop airing before it started. Either year may be absent — a show
            // still running has no last year at all — so this only bites when both are present.
            table.HasCheckConstraint(
                "ck_tv_shows_year_span",
                "first_air_year IS NULL OR last_air_year IS NULL OR last_air_year >= first_air_year");
        });

        // Native Postgres arrays, as `games` and `movies` use. Npgsql maps List<string> to text[]
        // with no converter and no join table, and supplies the value comparer EF needs to spot
        // an edit.
        builder.Property(show => show.Genres).HasColumnType("text[]");
        builder.Property(show => show.Creators).HasColumnType("text[]");

        // Same 50 as the other two. It holds one genre name, and TMDB's longest television genre
        // is "Action & Adventure".
        builder.Property(show => show.PrimaryGenre).HasMaxLength(50);

        // TMDB's own vocabulary — "Returning Series" is the longest of the six.
        builder.Property(show => show.AirStatus).HasMaxLength(30);

        // The whole run, multiplied by Postgres rather than by this application.
        //
        // `stored` rather than `virtual` because it is read on every board query and written
        // only when a refresh changes one of its inputs. Marking it computed is also what tells
        // EF never to name it in an INSERT or UPDATE — Postgres rejects a write to a generated
        // column outright (42601), so getting this wrong fails loudly on the first search.
        builder.Property(show => show.TotalRuntimeMinutes)
            .HasComputedColumnSql("number_of_episodes * episode_runtime_minutes", stored: true);
    }
}
