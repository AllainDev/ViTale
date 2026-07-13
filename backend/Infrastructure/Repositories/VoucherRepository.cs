using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class VoucherRepository : IVoucherRepository
{
    private readonly ApplicationDbContext _db;
    public VoucherRepository(ApplicationDbContext db) { _db = db; }

    public Task<Voucher?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Vouchers.Include(v => v.Partner).FirstOrDefaultAsync(v => v.Id == id, ct);

    public Task<int> CountRedemptionsAsync(Guid voucherId, CancellationToken ct = default) =>
        _db.TravelerVouchers.CountAsync(tv => tv.VoucherId == voucherId, ct);
}
