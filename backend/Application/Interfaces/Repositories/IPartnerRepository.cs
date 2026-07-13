using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IPartnerRepository
{
    Task<Partner?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Partner>> GetActiveAsync(string? type = null, CancellationToken ct = default);
    Task<Partner> CreateAsync(Partner partner, CancellationToken ct = default);
    Task UpdateAsync(Partner partner, CancellationToken ct = default);
}
