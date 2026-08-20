using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> builder)
    {
        builder.ToTable("media");

        builder.Property(m => m.Title).HasMaxLength(500);
        builder.Property(m => m.ExternalId).HasMaxLength(100);
        builder.Property(m => m.CoverUrl).HasMaxLength(500);

        // Restrict, not Cascade: deleting a lookup row should fail loudly rather than take
        // every title in that category with it.
        //
        // The constraint names are explicit because EF derives its default from the entity
        // name ("hobbies"), which would leave `\d media` pointing at a table that does not
        // exist under that name.
        builder.HasOne(m => m.Hobby)
            .WithMany(h => h.Media)
            .HasForeignKey(m => m.HobbyId)
            .HasConstraintName("fk_media_hobby_lu_hobby_id")
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(m => m.Source)
            .WithMany(s => s.Media)
            .HasForeignKey(m => m.SourceId)
            .HasConstraintName("fk_media_source_lu_source_id")
            .OnDelete(DeleteBehavior.Restrict);

        // The natural key the IGDB upsert dedupes on: one row per (source, that source's id
        // for it). Without this, searching "halo" twice inserts every result twice.
        //
        // Filtered because "manual" rows carry a null external_id and many of them must
        // coexist. Postgres already treats nulls as distinct in a unique index, so the filter
        // is not strictly required — it is here because it states the intent outright and
        // keeps the index to the rows it actually governs.
        builder.HasIndex(m => new { m.SourceId, m.ExternalId })
            .IsUnique()
            .HasFilter("external_id IS NOT NULL");

        // Supports the cross-hobby filter that Media.HobbyId exists for.
        builder.HasIndex(m => m.HobbyId);
    }
}
