using HobbyTracker.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace HobbyTracker.Api.Data;

public class HobbyTrackerDbContext(DbContextOptions<HobbyTrackerDbContext> options)
    : DbContext(options)
{
    public DbSet<Hobby> Hobbies => Set<Hobby>();
    public DbSet<Source> Sources => Set<Source>();

    /// <summary>Every title, of every hobby. Querying this under TPT does not touch `games`.</summary>
    public DbSet<Media> Media => Set<Media>();

    /// <summary>Games only. Querying this emits an INNER JOIN of `media` and `games`.</summary>
    public DbSet<Game> Games => Set<Game>();

    public DbSet<LogEntry> LogEntries => Set<LogEntry>();

    /// <summary>What was written during a pass. Child of log_entries, cascade deleted.</summary>
    public DbSet<Note> Notes => Set<Note>();

    public DbSet<User> Users => Set<User>();
    public DbSet<AuthIdentity> AuthIdentities => Set<AuthIdentity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Mapping lives in one IEntityTypeConfiguration<T> per entity under
        // Data/Configurations, so this method stays a table of contents rather than a wall.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(HobbyTrackerDbContext).Assembly);

        SeedData.Apply(modelBuilder);
    }
}
