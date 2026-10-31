using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class NotePictureConfiguration : IEntityTypeConfiguration<NotePicture>
{
    /// <summary>
    /// The three types a picture may be, as the check constraints spell them. JPEG, PNG and
    /// WebP are what a browser's canvas writes; anything else is refused before it gets here.
    /// </summary>
    public const string StoredTypes = "('image/jpeg', 'image/png', 'image/webp')";

    public void Configure(EntityTypeBuilder<NotePicture> builder)
    {
        builder.ToTable("note_pictures", table =>
        {
            // The picture route answers with this type, so it is the database's to refuse
            // anything else: the service reads the type from the bytes, and this is what keeps a
            // mistake in that from serving a page, or an SVG that carries script, from the app's
            // own address.
            table.HasCheckConstraint(
                "ck_note_pictures_content_type",
                $"content_type IN {StoredTypes}");

            // Each is read from the bytes, so nought is a reading gone wrong rather than a
            // picture: an <img> drawn nought wide, or one the account's total never counts.
            table.HasCheckConstraint(
                "ck_note_pictures_size",
                "width > 0 AND height > 0 AND byte_count > 0");
        });

        builder.Property(p => p.ContentType).HasMaxLength(20);

        // Cascade, as everything that hangs off a note does: whatever takes a note away takes its
        // pictures, with no code of its own. A note moving to another pass takes them with it,
        // because they hang off the note and not the pass.
        builder.HasOne(p => p.Note)
            .WithMany(n => n.Pictures)
            .HasForeignKey(p => p.NoteId)
            .OnDelete(DeleteBehavior.Cascade);

        // One picture to a place, and the index the drawer reads a note's pictures in order by.
        // A rewrite can put a new picture in the place one is leaving, and EF Core sends the
        // delete first, so the two never meet here; see NoteService's write.
        builder.HasIndex(p => new { p.NoteId, p.Position }).IsUnique();
    }
}
