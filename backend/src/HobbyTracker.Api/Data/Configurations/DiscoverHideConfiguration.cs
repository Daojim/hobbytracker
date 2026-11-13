using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class DiscoverHideConfiguration : IEntityTypeConfiguration<DiscoverHide>
{
    public void Configure(EntityTypeBuilder<DiscoverHide> builder)
    {
        builder.ToTable("discover_hides");

        // One person hiding one game is one row, so a second press of the eye — two tabs, or a
        // slow answer pressed again — can be nothing more than the first. The service recovers
        // from the 23505 this raises when two land at once. Leading with the user, because every
        // question asked of this table is one person's: what they hid, and whether they hid this.
        builder.HasKey(h => new { h.UserId, h.MediaId });

        // Mirrors users.created_at: a row written by hand in psql is still a valid row. The
        // service stamps it from the journal clock, so the default is a backstop.
        builder.Property(h => h.HiddenAt).HasDefaultValueSql("now()");

        // Cascade, so deleting an account takes its hides with it, as it takes every pass. The
        // deletion warning does not count them, the workshop's pick: they are a setting of taste
        // rather than anything a person wrote.
        builder.HasOne(h => h.User)
            .WithMany()
            .HasForeignKey(h => h.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Cascade, as log_entries does: nothing in the app deletes a title, and a hide of a title
        // that is gone hides nothing. The end-to-end suite truncates media between specs, and
        // this is what takes the hides with it.
        builder.HasOne(h => h.Media)
            .WithMany()
            .HasForeignKey(h => h.MediaId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
