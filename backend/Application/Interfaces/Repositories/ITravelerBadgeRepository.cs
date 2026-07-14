using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ITravelerBadgeRepository
{
    Task<IReadOnlyList<UserBadge>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default);
    Task CreateAsync(UserBadge badge, CancellationToken ct = default);
}
