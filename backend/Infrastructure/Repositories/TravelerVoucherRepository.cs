using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class TravelerVoucherRepository : ITravelerVoucherRepository
{
    private readonly ApplicationDbContext _db;
    public TravelerVoucherRepository(ApplicationDbContext db) { _db = db; }

    public Task<bool> ExistsAsync(Guid travelerId, Guid voucherId, CancellationToken ct = default) =>
        _db.TravelerVouchers.AnyAsync(tv => tv.TravelerId == travelerId && tv.VoucherId == voucherId, ct);

    public async Task<TravelerVoucher> CreateAsync(TravelerVoucher tv, CancellationToken ct = default)
    {
        _db.TravelerVouchers.Add(tv);
        await _db.SaveChangesAsync(ct);
        return tv;
    }

    public async Task<IReadOnlyList<TravelerVoucher>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default) =>
        await _db.TravelerVouchers.Where(tv => tv.TravelerId == travelerId).Include(tv => tv.Voucher).ToListAsync(ct);
}
