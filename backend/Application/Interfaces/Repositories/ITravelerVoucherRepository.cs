using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ITravelerVoucherRepository
{
    Task<bool> ExistsAsync(Guid travelerId, Guid voucherId, CancellationToken ct = default);
    Task<TravelerVoucher> CreateAsync(TravelerVoucher tv, CancellationToken ct = default);
    Task<IReadOnlyList<TravelerVoucher>> GetByTravelerIdAsync(Guid travelerId, CancellationToken ct = default);
}
