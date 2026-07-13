using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Infrastructure.Persistence;

/// <summary>
/// Design-time factory used exclusively by EF Core tools (dotnet ef migrations).
/// Uses a dummy connection string since migrations only need the schema, not actual DB access.
/// In CI/production, the actual DB_CONNECTION_STRING env var is used by the application.
/// </summary>
public class ApplicationDbContextFactory : IDesignTimeDbContextFactory<ApplicationDbContext>
{
    public ApplicationDbContext CreateDbContext(string[] args)
    {
        // Prefer actual connection string from env if available (e.g., in CI)
        var connectionString = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING")
            ?? "Host=localhost;Port=5432;Database=vitale_dev;Username=vitale;Password=vitale_dev_pass";

        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(connectionString, npg =>
            {
                npg.EnableRetryOnFailure(1);
            })
            .Options;

        return new ApplicationDbContext(options);
    }
}

