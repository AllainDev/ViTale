using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class CheckinRecordRepository : ICheckinRecordRepository
{
    private readonly ApplicationDbContext _db;
    public CheckinRecordRepository(ApplicationDbContext db) { _db = db; }

    public Task<bool> ExistsAsync(Guid travelerId, Guid checkpointId, Guid clientGeneratedId, CancellationToken ct = default) =>
        _db.CheckinRecords.AnyAsync(r =>
            r.TravelerId == travelerId &&
            r.CheckpointId == checkpointId &&
            r.ClientGeneratedId == clientGeneratedId, ct);

    public async Task<CheckinRecord> CreateAsync(CheckinRecord record, CancellationToken ct = default)
    {
        _db.CheckinRecords.Add(record);
        await _db.SaveChangesAsync(ct);
        return record;
    }

    public async Task<IReadOnlyList<CheckinRecord>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.CheckinRecords
            .Where(r => r.TravelerId == travelerId)
            .OrderByDescending(r => r.CheckinAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<Guid>> GetVisitedCheckpointIdsAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.CheckinRecords
            .Where(r => r.TravelerId == travelerId)
            .Select(r => r.CheckpointId)
            .Distinct()
            .ToListAsync(ct);
}
