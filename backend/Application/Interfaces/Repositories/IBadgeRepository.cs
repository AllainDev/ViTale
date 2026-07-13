using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IBadgeRepository
{
    Task<IReadOnlyList<Badge>> GetAllAsync(CancellationToken ct = default);
}
