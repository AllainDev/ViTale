using Domain.Enums;

namespace Domain.Entities;

public class PassportAccount
{
    public Guid Id { get; private set; }
    
    // OAuth fields (nullable for email/password accounts)
    public OAuthProvider? OAuthProvider { get; private set; }
    public string? OAuthUserId { get; private set; }
    
    // Email/Password fields
    public string Email { get; private set; } = string.Empty;
    public string? PasswordHash { get; private set; }
    public string? FullName { get; private set; }
    
    // Email verification
    public bool IsEmailVerified { get; private set; }
    public string? EmailVerificationToken { get; private set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; private set; }
    
    // Password reset
    public string? PasswordResetToken { get; private set; }
    public DateTime? PasswordResetTokenExpiresAt { get; private set; }
    
    // Account status
    public DateTime CreatedAt { get; private set; }
    public bool IsLocked { get; private set; }
    public DateTime? LastLoginAt { get; private set; }

    protected PassportAccount() { }

    // OAuth account creation
    public static PassportAccount CreateWithOAuth(OAuthProvider provider, string oAuthUserId, string email, string? fullName = null)
    {
        return new PassportAccount
        {
            Id = Guid.NewGuid(),
            OAuthProvider = provider,
            OAuthUserId = oAuthUserId,
            Email = email,
            FullName = fullName,
            IsEmailVerified = true, // OAuth providers verify email
            CreatedAt = DateTime.UtcNow,
            IsLocked = false
        };
    }

    // Email/Password account creation
    public static PassportAccount CreateWithEmailPassword(string email, string passwordHash, string fullName)
    {
        var account = new PassportAccount
        {
            Id = Guid.NewGuid(),
            Email = email.ToLowerInvariant(),
            PasswordHash = passwordHash,
            FullName = fullName,
            IsEmailVerified = false,
            CreatedAt = DateTime.UtcNow,
            IsLocked = false
        };
        
        account.GenerateEmailVerificationToken();
        return account;
    }

    public void LinkOAuthProvider(OAuthProvider provider, string oAuthUserId)
    {
        if (OAuthProvider != null)
            throw new InvalidOperationException("Account is already linked to an OAuth provider.");

        OAuthProvider = provider;
        OAuthUserId = oAuthUserId;
        IsEmailVerified = true;
    }

    public void GenerateEmailVerificationToken()
    {
        EmailVerificationToken = Guid.NewGuid().ToString("N"); // 32 char hex
        EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
    }

    public bool VerifyEmail(string token)
    {
        if (IsEmailVerified)
            return false;

        if (EmailVerificationToken != token)
            return false;

        if (EmailVerificationTokenExpiresAt == null || DateTime.UtcNow > EmailVerificationTokenExpiresAt)
            return false;

        IsEmailVerified = true;
        EmailVerificationToken = null;
        EmailVerificationTokenExpiresAt = null;
        return true;
    }

    public void GeneratePasswordResetToken()
    {
        PasswordResetToken = Guid.NewGuid().ToString("N");
        PasswordResetTokenExpiresAt = DateTime.UtcNow.AddHours(2);
    }

    public bool ResetPassword(string token, string newPasswordHash)
    {
        if (PasswordResetToken != token)
            return false;

        if (PasswordResetTokenExpiresAt == null || DateTime.UtcNow > PasswordResetTokenExpiresAt)
            return false;

        PasswordHash = newPasswordHash;
        PasswordResetToken = null;
        PasswordResetTokenExpiresAt = null;
        return true;
    }

    public void UpdateFullName(string fullName)
    {
        FullName = fullName;
    }

    public void ChangePassword(string newPasswordHash)
    {
        PasswordHash = newPasswordHash;
    }

    public void UpdateLastLogin()
    {
        LastLoginAt = DateTime.UtcNow;
    }

    public void Lock()
    {
        IsLocked = true;
    }

    public void Unlock()
    {
        IsLocked = false;
    }
}

