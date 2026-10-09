using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class NoteConfiguration : IEntityTypeConfiguration<Note>
{
    public void Configure(EntityTypeBuilder<Note> builder)
    {
        builder.ToTable("notes");

        // The limit the log_entries.notes column carried, kept so the migration cannot truncate
        // anything on its way across.
        builder.Property(n => n.Body).HasMaxLength(4000);

        // Mirrors log_entries.logged_at: the database can fill this in, so a row written by hand
        // in psql is still a valid row. The service stamps it from the journal clock on every
        // insert it makes, so the default is a backstop rather than the normal path.
        builder.Property(n => n.WrittenAt).HasDefaultValueSql("now()");

        // Cascade, for when a title's whole journal goes: its last pass deleted, Remove from board,
        // an account deleted. A note with no pass at all has nowhere to be shown. Deleting one pass
        // of several moves its notes to the current pass first (LogEntryService.DeleteAsync), so
        // the cascade never takes a note while the title still has a pass to keep it on.
        builder.HasOne(n => n.LogEntry)
            .WithMany(e => e.Notes)
            .HasForeignKey(n => n.LogEntryId)
            .OnDelete(DeleteBehavior.Cascade);

        // Covers the query this table exists to serve: one pass's notes, newest first.
        builder.HasIndex(n => new { n.LogEntryId, n.WrittenAt });
    }
}
