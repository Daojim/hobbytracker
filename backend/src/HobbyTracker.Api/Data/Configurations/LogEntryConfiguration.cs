using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class LogEntryConfiguration : IEntityTypeConfiguration<LogEntry>
{
    public void Configure(EntityTypeBuilder<LogEntry> builder)
    {
        builder.ToTable("log_entries", table =>
        {
            table.HasCheckConstraint(
                "ck_log_entries_rating_range",
                "rating IS NULL OR (rating >= 1.0 AND rating <= 10.0)");

            // Nought hours played is not a fact, and numeric(5,2) stops at 999.99 — past which
            // Postgres throws rather than rounding. Mirrors PlaytimeHoursAttribute, which
            // catches both before a request ever reaches here.
            table.HasCheckConstraint(
                "ck_log_entries_hours_played_range",
                "hours_played IS NULL OR (hours_played > 0 AND hours_played <= 999.99)");

            // A completion cannot precede its own start. Cheap to enforce here, and it
            // stops a UI bug from quietly writing nonsense into the history.
            table.HasCheckConstraint(
                "ck_log_entries_timestamp_order",
                "started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at");

            // Where you are in a show, and the two halves of it are constrained differently on
            // purpose. Season nought is TMDB's Specials and is a real season, so it is allowed;
            // there is no episode zero, so that one starts at 1.
            table.HasCheckConstraint(
                "ck_log_entries_season_range",
                "season_number IS NULL OR season_number >= 0");

            table.HasCheckConstraint(
                "ck_log_entries_episode_range",
                "episode_number IS NULL OR episode_number >= 1");

            // "Episode 7" with no season says nothing. The other way round is fine and means
            // something real — knowing where you are to the season and no further. Three named
            // constraints rather than one conjunction, so a violation names the rule it broke.
            //
            // No upper bound against the show's own season or episode counts, deliberately: a
            // season gets re-cut upstream, and refusing a value that was true when it was
            // written is the mistake Platform's comment already argues against. The dropdown
            // offers the shape that exists now; the column keeps the record.
            table.HasCheckConstraint(
                "ck_log_entries_episode_needs_season",
                "episode_number IS NULL OR season_number IS NOT NULL");
        });

        // Stored as text rather than an int ordinal, so `select status from log_entries`
        // is readable and reordering LogStatus can never silently reinterpret old rows.
        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // 1.0–10.0, one decimal place.
        builder.Property(e => e.Rating).HasPrecision(3, 1);

        // Up to 999.99 hours, to the nearest hundredth — the same shape as
        // games.hltb_main_story_hours, which is the number this one gets compared against.
        builder.Property(e => e.HoursPlayed).HasPrecision(5, 2);

        // Free text, not a lookup: IGDB names platforms and the UI offers that list, but the
        // list is theirs to change and a stored value has to outlive it. See LogEntry.Platform.
        builder.Property(e => e.Platform).HasMaxLength(100);

        // Mirrors users.created_at: the database can fill this in, so a row written by hand in
        // psql is still a valid row. The service sets it from the journal clock on every insert
        // it makes, so the default is a backstop rather than the normal path.
        builder.Property(e => e.LoggedAt).HasDefaultValueSql("now()");

        // Cascade rather than SetNull, and it had to change with the column: EF refuses SetNull
        // against a non-nullable foreign key and fails model validation at boot rather than at
        // runtime. Deleting an account now takes its journal with it, which is the honest
        // reading — a pass with no owner cannot exist, so there is nothing to leave behind.
        builder.HasOne(e => e.User)
            .WithMany(u => u.LogEntries)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cascade here is correct: an entry is meaningless without the title it logs.
        builder.HasOne(e => e.Media)
            .WithMany(m => m.LogEntries)
            .HasForeignKey(e => e.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Covers the query this table exists to serve: one user's entries for one title.
        builder.HasIndex(e => new { e.UserId, e.MediaId });
    }
}
