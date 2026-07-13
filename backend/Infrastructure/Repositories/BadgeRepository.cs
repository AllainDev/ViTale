using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class BadgeRepository : IBadgeRepository
{
    private readonly ApplicationDbContext _db;
    public BadgeRepository(ApplicationDbContext db) { _db = db; }

    public async Task<IReadOnlyList<Badge>> GetAllAsync(CancellationToken ct = default) =>
        await _db.Badges.ToListAsync(ct);
}
