using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ICheckinRecordRepository
{
    Task<bool> ExistsAsync(Guid travelerId, Guid checkpointId, Guid clientGeneratedId, CancellationToken ct = default);
    Task<CheckinRecord> CreateAsync(CheckinRecord record, CancellationToken ct = default);
    Task<IReadOnlyList<CheckinRecord>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default);
    Task<IReadOnlyList<Guid>> GetVisitedCheckpointIdsAsync(Guid travelerId, CancellationToken ct = default);
}
