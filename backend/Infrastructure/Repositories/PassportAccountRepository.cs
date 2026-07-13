using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class PassportAccountRepository : IPassportAccountRepository
{
    private readonly ApplicationDbContext _db;
    public PassportAccountRepository(ApplicationDbContext db) { _db = db; }

    public Task<PassportAccount?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return _db.PassportAccounts.FirstOrDefaultAsync(a => a.Id == id, ct);
    }

    public Task<PassportAccount?> GetByProviderAsync(string provider, string oAuthUserId, CancellationToken ct = default)
    {
        if (!Enum.TryParse<Domain.Enums.OAuthProvider>(provider, true, out var enumProvider))
            return Task.FromResult<PassportAccount?>(null);
        return _db.PassportAccounts
           .FirstOrDefaultAsync(a => a.OAuthProvider == enumProvider && a.OAuthUserId == oAuthUserId, ct);
    }

    public Task<PassportAccount?> GetByEmailAsync(string email, CancellationToken ct = default)
    {
        var normalizedEmail = email.ToLowerInvariant();
        return _db.PassportAccounts
            .FirstOrDefaultAsync(a => a.Email.ToLower() == normalizedEmail, ct);
    }

    public Task<PassportAccount?> GetByEmailVerificationTokenAsync(string token, CancellationToken ct = default)
    {
        return _db.PassportAccounts
            .FirstOrDefaultAsync(a => a.EmailVerificationToken == token, ct);
    }

    public Task<PassportAccount?> GetByPasswordResetTokenAsync(string token, CancellationToken ct = default)
    {
        return _db.PassportAccounts
            .FirstOrDefaultAsync(a => a.PasswordResetToken == token, ct);
    }

    public async Task<PassportAccount> CreateAsync(PassportAccount account, CancellationToken ct = default)
    {
        _db.PassportAccounts.Add(account);
        await _db.SaveChangesAsync(ct);
        return account;
    }

    public async Task UpdateAsync(PassportAccount account, CancellationToken ct = default)
    {
        _db.PassportAccounts.Update(account);
        await _db.SaveChangesAsync(ct);
    }
}
