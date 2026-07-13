using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class PartnerRepository : IPartnerRepository
{
    private readonly ApplicationDbContext _db;
    public PartnerRepository(ApplicationDbContext db) { _db = db; }

    public Task<Partner?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Partners.Include(p => p.Vouchers).FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<IReadOnlyList<Partner>> GetActiveAsync(string? type = null, CancellationToken ct = default)
    {
        var q = _db.Partners.Where(p => p.IsActive).Include(p => p.Vouchers).AsQueryable();
        if (!string.IsNullOrEmpty(type))
            q = q.Where(p => p.Type.ToString() == type);
        return await q.OrderByDescending(p => p.PriorityScore).ToListAsync(ct);
    }

    public async Task<Partner> CreateAsync(Partner partner, CancellationToken ct = default)
    {
        _db.Partners.Add(partner);
        await _db.SaveChangesAsync(ct);
        return partner;
    }

    public async Task UpdateAsync(Partner partner, CancellationToken ct = default)
    {
        _db.Partners.Update(partner);
        await _db.SaveChangesAsync(ct);
    }
}
