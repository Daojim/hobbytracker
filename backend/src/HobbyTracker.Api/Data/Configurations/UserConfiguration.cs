using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");

        builder.Property(u => u.DisplayName).HasMaxLength(100);
        builder.Property(u => u.Role).HasMaxLength(50).HasDefaultValue("user");

        // Defaulted in the database so a row inserted by hand (psql, a fixture, a later
        // seeding script) still gets a timestamp.
        builder.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
    }
}
