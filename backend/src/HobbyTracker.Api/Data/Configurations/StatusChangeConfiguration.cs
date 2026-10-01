using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class StatusChangeConfiguration : IEntityTypeConfiguration<StatusChange>
{
    public void Configure(EntityTypeBuilder<StatusChange> builder)
    {
        builder.ToTable("status_changes", table =>
        {
            // A row is a move, and a move goes somewhere else. A shuffle that comes back where it
            // started is deleted by the recorder rather than kept as "Backlog to Backlog"; this is
            // what makes forgetting to do that fail loudly instead of storing a move nobody made.
            // A null from_status is a pass being made, which is always a change.
            table.HasCheckConstraint(
                "ck_status_changes_is_a_change",
                "from_status IS NULL OR from_status <> to_status");
        });

        // Text, for log_entries.status's reasons exactly: readable in psql, immune to LogStatus
        // being reordered, and a new value needs no migration because nothing constrains what
        // the column holds.
        builder.Property(c => c.FromStatus)
            .HasConversion<string>()
            .HasMaxLength(20);

        builder.Property(c => c.ToStatus)
            .HasConversion<string>()
            .HasMaxLength(20);

        // Mirrors log_entries.logged_at and notes.written_at: a row written by hand in psql is
        // still a valid row. The recorder stamps it from the journal clock on every row it writes,
        // so the default is a backstop rather than the normal path.
        builder.Property(c => c.ChangedAt).HasDefaultValueSql("now()");

        // Cascade, as notes do: a pass's history is meaningless without the pass. Deleting one
        // in the drawer, Remove from board, and an account going all take it with them — the
        // last through log_entries' own cascade from users.
        //
        // No collection on LogEntry. Nothing reads a pass's history through the pass, and a
        // reader scopes through this side anyway, as NoteService does.
        builder.HasOne(c => c.LogEntry)
            .WithMany()
            .HasForeignKey(c => c.LogEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        // Covers both questions asked of this table: a pass's history in order, and the latest
        // row the recorder checks before it writes another.
        builder.HasIndex(c => new { c.LogEntryId, c.ChangedAt });
    }
}
