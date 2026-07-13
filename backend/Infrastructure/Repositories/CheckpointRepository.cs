using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class CheckpointRepository : ICheckpointRepository
{
    private readonly ApplicationDbContext _db;
    private readonly Application.Interfaces.Services.IGeolocationService _geo;

    public CheckpointRepository(ApplicationDbContext db, Application.Interfaces.Services.IGeolocationService geo)
    {
        _db = db;
        _geo = geo;
    }

    public Task<Checkpoint?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Checkpoints.Include(c => c.StoryChapter).FirstOrDefaultAsync(c => c.Id == id, ct);

    public async Task<IReadOnlyList<Checkpoint>> GetAllActiveAsync(CancellationToken ct = default) =>
        await _db.Checkpoints.Where(c => c.IsActive).Include(c => c.StoryChapter).ToListAsync(ct);

    public async Task<IReadOnlyList<(Checkpoint Checkpoint, double DistanceMeters)>> GetNearbyAsync(
        decimal lat, decimal lng, int radiusMeters, int maxResults = 20, CancellationToken ct = default)
    {
        // Load all active checkpoints and filter in memory using haversine
        // For production with many checkpoints, replace with PostGIS spatial query
        var all = await _db.Checkpoints
            .Where(c => c.IsActive)
            .Include(c => c.StoryChapter)
            .ToListAsync(ct);

        return all
            .Select(c => (c, _geo.CalculateDistanceMeters(lat, lng, c.Latitude, c.Longitude)))
            .Where(x => x.Item2 <= radiusMeters)
            .OrderBy(x => x.Item2)
            .Take(maxResults)
            .Select(x => (x.c, x.Item2))
            .ToList();
    }
}
