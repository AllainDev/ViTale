using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ITravelerRepository
{
    Task<Traveler?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Traveler?> GetByAnonymousIdAsync(string anonymousId, CancellationToken ct = default);
    Task<Traveler?> GetByLinkedAccountIdAsync(Guid accountId, CancellationToken ct = default);
    Task<Traveler> CreateAsync(Traveler traveler, CancellationToken ct = default);
    Task UpdateAsync(Traveler traveler, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
