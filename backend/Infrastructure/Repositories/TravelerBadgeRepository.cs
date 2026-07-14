using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class TravelerBadgeRepository : ITravelerBadgeRepository
{
    private readonly ApplicationDbContext _db;
    public TravelerBadgeRepository(ApplicationDbContext db) { _db = db; }

    public async Task<IReadOnlyList<UserBadge>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.UserBadges.Where(b => b.UserId == travelerId).ToListAsync(ct);

    public async Task CreateAsync(UserBadge badge, CancellationToken ct = default)
    {
        _db.UserBadges.Add(badge);
        await _db.SaveChangesAsync(ct);
    }
}
