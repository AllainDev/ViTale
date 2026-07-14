using Domain.Entities;

namespace Application.Interfaces.Persistence;

public interface IUnitOfWork
{
    IGenericRepository<AdminUser> AdminUsers { get; }
    IGenericRepository<Character> Characters { get; }
    IGenericRepository<Product> Products { get; }
    IGenericRepository<DollToken> DollTokens { get; }
    IGenericRepository<PassportAccount> PassportAccounts { get; }
    IGenericRepository<Checkpoint> Checkpoints { get; }
    IGenericRepository<Region> Regions { get; }
    IGenericRepository<UserGamificationProfile> UserGamificationProfiles { get; }
    IGenericRepository<UserStamp> UserStamps { get; }

    Task<int> SaveChangesAsync(CancellationToken ct = default);
    Task<TResult> ExecuteInTransactionAsync<TResult>(Func<Task<TResult>> operation, CancellationToken ct = default);
}
