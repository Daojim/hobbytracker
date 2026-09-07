using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class TvSeasonConfiguration : IEntityTypeConfiguration<TvSeason>
{
    public void Configure(EntityTypeBuilder<TvSeason> builder)
    {
        builder.ToTable("tv_seasons", table =>
        {
            // Season 0 is TMDB's Specials, so nought is a real season rather than a missing
            // value — the same allowance ck_log_entries_season_range makes about a pass.
            table.HasCheckConstraint(
                "ck_tv_seasons_season_number",
                "season_number >= 0");

            // Nought episodes is allowed where a nought runtime is not, and the difference is
            // real: TMDB lists announced seasons whose episodes are not known yet, which is a
            // fact about the show. A runtime of nought is only ever a mapping mistake.
            table.HasCheckConstraint(
                "ck_tv_seasons_episode_count",
                "episode_count >= 0");
        });

        // Natural key, not a surrogate one. A show cannot have two season 3s, and putting that
        // in the primary key means the database refuses the second rather than the refresh code
        // having to remember not to write it.
        builder.HasKey(season => new { season.MediaId, season.SeasonNumber });

        builder.Property(season => season.Name).HasMaxLength(200);

        // Cascade, because a season belongs to its show the way a note belongs to the pass it
        // was written during. Removing a title from the catalogue takes its seasons with it and
        // leaves nothing behind to point at a row that is gone.
        builder.HasOne(season => season.Show)
            .WithMany(show => show.Seasons)
            .HasForeignKey(season => season.MediaId)
            .HasConstraintName("fk_tv_seasons_tv_shows_media_id")
            .OnDelete(DeleteBehavior.Cascade);
    }
}
