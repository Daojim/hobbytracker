using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class NotePictureBytesConfiguration : IEntityTypeConfiguration<NotePictureBytes>
{
    public void Configure(EntityTypeBuilder<NotePictureBytes> builder)
    {
        builder.ToTable("note_picture_bytes", table =>
        {
            // The thumbnail route answers with this type, for note_pictures.content_type's
            // reason exactly.
            table.HasCheckConstraint(
                "ck_note_picture_bytes_thumbnail_type",
                $"thumbnail_type IN {NotePictureConfiguration.StoredTypes}");
        });

        // The picture's own id, and not a surrogate: one row of bytes per picture, which a
        // primary key says and a unique index beside an id would only repeat.
        builder.HasKey(b => b.PictureId);

        builder.Property(b => b.ThumbnailType).HasMaxLength(20);

        // One-to-one, configured from this side only. A picture has no navigation to its bytes,
        // so no Include can reach them; cascade, so whatever takes the picture takes these.
        builder.HasOne(b => b.Picture)
            .WithOne()
            .HasForeignKey<NotePictureBytes>(b => b.PictureId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
