using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IStampRepository
{
    Task<bool> ExistsAsync(Guid travelerId, Guid checkpointId, CancellationToken ct = default);
    Task<Stamp> CreateAsync(Stamp stamp, CancellationToken ct = default);
    Task<IReadOnlyList<Stamp>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default);
}
