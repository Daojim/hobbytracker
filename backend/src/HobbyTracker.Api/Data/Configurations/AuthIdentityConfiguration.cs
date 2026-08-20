using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace HobbyTracker.Api.Data.Configurations;

public class AuthIdentityConfiguration : IEntityTypeConfiguration<AuthIdentity>
{
    public void Configure(EntityTypeBuilder<AuthIdentity> builder)
    {
        builder.ToTable("auth_identities");

        builder.Property(a => a.Provider).HasMaxLength(50);
        builder.Property(a => a.ProviderUserId).HasMaxLength(200);
        builder.Property(a => a.Email).HasMaxLength(320);

        // The login lookup key. Unique so one provider account cannot be attached to two
        // users — that would let either of them sign in as the other.
        builder.HasIndex(a => new { a.Provider, a.ProviderUserId }).IsUnique();

        builder.HasOne(a => a.User)
            .WithMany(u => u.AuthIdentities)
            .HasForeignKey(a => a.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
