using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IPassportAccountRepository
{
    Task<PassportAccount?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PassportAccount?> GetByProviderAsync(string provider, string oAuthUserId, CancellationToken ct = default);
    Task<PassportAccount?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<PassportAccount?> GetByEmailVerificationTokenAsync(string token, CancellationToken ct = default);
    Task<PassportAccount?> GetByPasswordResetTokenAsync(string token, CancellationToken ct = default);
    Task<PassportAccount> CreateAsync(PassportAccount account, CancellationToken ct = default);
    Task UpdateAsync(PassportAccount account, CancellationToken ct = default);
}
