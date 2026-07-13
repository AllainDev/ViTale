using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ITravelerBadgeRepository
{
    Task<bool> ExistsAsync(Guid travelerId, Guid badgeId, CancellationToken ct = default);
    Task<TravelerBadge> CreateAsync(TravelerBadge travelerBadge, CancellationToken ct = default);
    Task<IReadOnlyList<TravelerBadge>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default);
}
