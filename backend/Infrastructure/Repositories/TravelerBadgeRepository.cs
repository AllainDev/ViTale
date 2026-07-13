using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class TravelerBadgeRepository : ITravelerBadgeRepository
{
    private readonly ApplicationDbContext _db;
    public TravelerBadgeRepository(ApplicationDbContext db) { _db = db; }

    public Task<bool> ExistsAsync(Guid travelerId, Guid badgeId, CancellationToken ct = default) =>
        _db.TravelerBadges.AnyAsync(tb => tb.TravelerId == travelerId && tb.BadgeId == badgeId, ct);

    public async Task<TravelerBadge> CreateAsync(TravelerBadge travelerBadge, CancellationToken ct = default)
    {
        _db.TravelerBadges.Add(travelerBadge);
        await _db.SaveChangesAsync(ct);
        return travelerBadge;
    }

    public async Task<IReadOnlyList<TravelerBadge>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.TravelerBadges
            .Where(tb => tb.TravelerId == travelerId)
            .Include(tb => tb.Badge)
            .ToListAsync(ct);
}
