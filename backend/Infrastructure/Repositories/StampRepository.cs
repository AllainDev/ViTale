using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class StampRepository : IStampRepository
{
    private readonly ApplicationDbContext _db;
    public StampRepository(ApplicationDbContext db) { _db = db; }

    public Task<bool> ExistsAsync(Guid travelerId, Guid checkpointId, CancellationToken ct = default) =>
        _db.Stamps.AnyAsync(s => s.TravelerId == travelerId && s.CheckpointId == checkpointId, ct);

    public async Task<Stamp> CreateAsync(Stamp stamp, CancellationToken ct = default)
    {
        _db.Stamps.Add(stamp);
        await _db.SaveChangesAsync(ct);
        return stamp;
    }

    public async Task<IReadOnlyList<Stamp>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.Stamps
            .Where(s => s.TravelerId == travelerId)
            .Include(s => s.Checkpoint)
            .OrderByDescending(s => s.EarnedAt)
            .ToListAsync(ct);
}
