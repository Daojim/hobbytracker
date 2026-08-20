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
                "ck_log_entries_date_order",
                "date_started IS NULL OR date_completed IS NULL OR date_completed >= date_started");
        });

        // Stored as text rather than an int ordinal, so `select status from log_entries`
        // is readable and reordering LogStatus can never silently reinterpret old rows.
        builder.Property(e => e.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // 1.0–10.0, one decimal place.
        builder.Property(e => e.Rating).HasPrecision(3, 1);

        builder.Property(e => e.Notes).HasMaxLength(4000);

        // SetNull rather than Cascade: deleting an account should not erase the journal, and
        // UserId is nullable already while auth is still Phase 2 work.
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
