using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class HobbyConfiguration : IEntityTypeConfiguration<Hobby>
{
    public void Configure(EntityTypeBuilder<Hobby> builder)
    {
        builder.ToTable("hobby_lu");

        // Migration-managed reference data: keep the ids we chose instead of letting
        // Postgres hand out identity values that the seeded rows would then contradict.
        builder.Property(h => h.Id).ValueGeneratedNever();

        builder.Property(h => h.Name).HasMaxLength(50);
        builder.HasIndex(h => h.Name).IsUnique();
    }
}
