using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class TravelerRepository : ITravelerRepository
{
    private readonly ApplicationDbContext _db;
    public TravelerRepository(ApplicationDbContext db) { _db = db; }

    public Task<Traveler?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Travelers.FirstOrDefaultAsync(t => t.Id == id, ct);

    public Task<Traveler?> GetByAnonymousIdAsync(string anonymousId, CancellationToken ct = default) =>
        _db.Travelers.FirstOrDefaultAsync(t => t.AnonymousId == anonymousId, ct);

    public async Task<Traveler> CreateAsync(Traveler traveler, CancellationToken ct = default)
    {
        _db.Travelers.Add(traveler);
        await _db.SaveChangesAsync(ct);
        return traveler;
    }

    public async Task UpdateAsync(Traveler traveler, CancellationToken ct = default)
    {
        _db.Travelers.Update(traveler);
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        await _db.Travelers.Where(t => t.Id == id).ExecuteDeleteAsync(ct);
    }
}
