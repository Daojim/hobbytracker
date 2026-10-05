using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class BoardShareConfiguration : IEntityTypeConfiguration<BoardShare>
{
    public void Configure(EntityTypeBuilder<BoardShare> builder)
    {
        builder.ToTable("board_shares");

        // The whole address's secret, and the lookup key a visitor arrives with. Twenty-two
        // characters, because sixteen bytes in base64url are exactly that.
        builder.Property(s => s.Token).HasMaxLength(22);
        builder.HasIndex(s => s.Token).IsUnique();

        // One link per board. A second row would be an address Settings could not show or stop,
        // so making one where one exists is refused — by this index, which also settles two tabs
        // pressing Make the link at once.
        builder.HasIndex(s => new { s.UserId, s.HobbyId }).IsUnique();

        // A Postgres text[] of the parts' names, for log_entries.status's reasons: readable in
        // psql, and immune to SharePart being reordered. No check constraint on what it holds,
        // for the same reason status has none: a part added later needs no migration.
        builder.PrimitiveCollection(s => s.Parts)
            .HasColumnType("text[]")
            .ElementType()
            .HasConversion<string>();

        // Mirrors users.created_at: a row written by hand in psql is still a valid row. The
        // service stamps it from the journal clock, so the default is a backstop.
        builder.Property(s => s.CreatedAt).HasDefaultValueSql("now()");

        // Cascade, so deleting an account takes its shares with it, as it takes every pass. A
        // share whose owner is gone would be a board of nobody's, still answering.
        builder.HasOne(s => s.User)
            .WithMany()
            .HasForeignKey(s => s.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // Restrict: hobby_lu is reference data the migrations own, and nothing deletes from it.
        builder.HasOne(s => s.Hobby)
            .WithMany()
            .HasForeignKey(s => s.HobbyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
