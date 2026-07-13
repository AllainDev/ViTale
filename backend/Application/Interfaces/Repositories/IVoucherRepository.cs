using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IVoucherRepository
{
    Task<Voucher?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<int> CountRedemptionsAsync(Guid voucherId, CancellationToken ct = default);
}
