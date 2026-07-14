using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ICheckpointRepository
{
    Task<Checkpoint?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IReadOnlyList<Checkpoint>> GetAllActiveAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Checkpoint>> GetActiveAsync(CancellationToken ct = default);
    Task<IReadOnlyList<(Checkpoint Checkpoint, double DistanceMeters)>> GetNearbyAsync(decimal lat, decimal lng, int radiusMeters, int maxResults = 20, CancellationToken ct = default);
}
