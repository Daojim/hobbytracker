using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class SourceConfiguration : IEntityTypeConfiguration<Source>
{
    public void Configure(EntityTypeBuilder<Source> builder)
    {
        builder.ToTable("source_lu");

        // See HobbyConfiguration: fixed ids, seeded by migration.
        builder.Property(s => s.Id).ValueGeneratedNever();

        builder.Property(s => s.Name).HasMaxLength(50);
        builder.HasIndex(s => s.Name).IsUnique();

        // Nullable by design — "manual" has no API behind it.
        builder.Property(s => s.BaseUrl).HasMaxLength(500);
    }
}
