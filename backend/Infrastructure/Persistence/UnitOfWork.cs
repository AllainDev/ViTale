using Application.Interfaces.Persistence;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly ApplicationDbContext _db;

    public UnitOfWork(ApplicationDbContext db)
    {
        _db = db;
        AdminUsers = new GenericRepository<AdminUser>(_db);
        Characters = new GenericRepository<Character>(_db);
        Products = new GenericRepository<Product>(_db);
        DollTokens = new GenericRepository<DollToken>(_db);
        PassportAccounts = new GenericRepository<PassportAccount>(_db);
        Checkpoints = new GenericRepository<Checkpoint>(_db);
        Regions = new GenericRepository<Region>(_db);
        UserGamificationProfiles = new GenericRepository<UserGamificationProfile>(_db);
        UserStamps = new GenericRepository<UserStamp>(_db);
    }

    public IGenericRepository<AdminUser> AdminUsers { get; }
    public IGenericRepository<Character> Characters { get; }
    public IGenericRepository<Product> Products { get; }
    public IGenericRepository<DollToken> DollTokens { get; }
    public IGenericRepository<PassportAccount> PassportAccounts { get; }
    public IGenericRepository<Checkpoint> Checkpoints { get; }
    public IGenericRepository<Region> Regions { get; }
    public IGenericRepository<UserGamificationProfile> UserGamificationProfiles { get; }
    public IGenericRepository<UserStamp> UserStamps { get; }

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
    {
        return await _db.SaveChangesAsync(ct);
    }

    public async Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> operation, CancellationToken ct = default)
    {
        var strategy = _db.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            await using var tx = await _db.Database.BeginTransactionAsync(ct);
            try
            {
                var result = await operation();
                await tx.CommitAsync(ct);
                return result;
            }
            catch
            {
                await tx.RollbackAsync(ct);
                throw;
            }
        });
    }
}
