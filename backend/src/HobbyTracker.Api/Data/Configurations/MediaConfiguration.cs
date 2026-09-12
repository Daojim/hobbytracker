using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> builder)
    {
        // The three states of release_precision, spelled out so a fourth is unreachable rather
        // than merely unlikely.
        //
        // The failure this exists for is silent and permanent. A precision carrying a start and
        // no end never satisfies `release_end <= today`, so the title sits in the calendar for
        // ever with nothing anywhere to say why — and a date carrying no precision is
        // indistinguishable from a title nobody has asked about, so it reads as released
        // whatever day it holds.
        //
        // Every row that exists when this arrives is all-null, which is the first branch, which
        // is what makes the migration safe to run against a real library.
        //
        // A CASE rather than the OR of three conjunctions it started as, and the test caught
        // why: a null precision carrying dates made every arm of that version either false or
        // NULL, and `false OR false OR NULL` is NULL — which a Postgres CHECK accepts. The hole
        // was exactly the state the constraint exists to forbid. A CASE is total, and its ELSE
        // also refuses a precision string this app has no enum member for.
        builder.ToTable("media", table => table.HasCheckConstraint(
            "ck_media_release_window",
            """
            CASE
                WHEN release_precision IS NULL
                    THEN release_date IS NULL AND release_end IS NULL
                WHEN release_precision = 'Unknown'
                    THEN release_date IS NULL AND release_end IS NULL
                WHEN release_precision IN ('Day', 'Month', 'Quarter', 'Year')
                    THEN release_date IS NOT NULL AND release_end IS NOT NULL
                         AND release_end >= release_date
                ELSE false
            END
            """));

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

        // Text rather than an int ordinal, exactly as log_entries.status is stored and for the
        // stated reason there: reordering the enum must never reinterpret existing rows.
        builder.Property(m => m.ReleasePrecision).HasConversion<string>().HasMaxLength(20);
        builder.Property(m => m.ReleaseStatus).HasConversion<string>().HasMaxLength(20);

        // What the Backlog partition compares against. Narrow by construction: only the rows a
        // provider has actually answered about carry a value.
        builder.HasIndex(m => m.ReleaseEnd);
    }
}
