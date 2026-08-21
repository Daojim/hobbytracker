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

            // A completion cannot precede its own start. Cheap to enforce here, and it
            // stops a UI bug from quietly writing nonsense into the history.
            table.HasCheckConstraint(
                "ck_log_entries_timestamp_order",
                "started_at IS NULL OR completed_at IS NULL OR completed_at >= started_at");
        });

        // Stored as text rather than an int ordinal, so `select status from log_entries`
        // is readable and reordering LogStatus can never silently reinterpret old rows.
        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // 1.0–10.0, one decimal place.
        builder.Property(e => e.Rating).HasPrecision(3, 1);

        // Free text, not a lookup: IGDB names platforms and the UI offers that list, but the
        // list is theirs to change and a stored value has to outlive it. See LogEntry.Platform.
        builder.Property(e => e.Platform).HasMaxLength(100);

        // Mirrors users.created_at: the database can fill this in, so a row written by hand in
        // psql is still a valid row. The service sets it from the journal clock on every insert
        // it makes, so the default is a backstop rather than the normal path.
        builder.Property(e => e.LoggedAt).HasDefaultValueSql("now()");

        // SetNull rather than Cascade: deleting an account should not erase the journal, and
        // UserId is nullable already while auth is still ahead of us.
        builder.HasOne(e => e.User)
            .WithMany(u => u.LogEntries)
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.SetNull);

        // Cascade here is correct: an entry is meaningless without the title it logs.
        builder.HasOne(e => e.Media)
            .WithMany(m => m.LogEntries)
            .HasForeignKey(e => e.MediaId)
            .OnDelete(DeleteBehavior.Cascade);

        // Covers the query this table exists to serve: one user's entries for one title.
        builder.HasIndex(e => new { e.UserId, e.MediaId });
    }
}
