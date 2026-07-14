namespace Application.Interfaces.Services;

using Application.DTOs;





// ── Text-to-Speech ───────────────────────────────────────────
public interface ITextToSpeechService
{
    Task<string?> GenerateAudioAsync(string text, string languageCode, string sessionId, CancellationToken ct = default);
}

// ── Authentication ───────────────────────────────────────────
public interface IAuthenticationService
{
    Task<OAuthValidationResult> ValidateOAuthTokenAsync(string provider, string token, CancellationToken ct = default);
    string GenerateJwt(Guid travelerId, string? email, bool isRegistered);
    string GenerateAdminJwt(Guid adminId, string username);
    JwtValidationResult? ValidateJwt(string token);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}





// ── Checkpoint ───────────────────────────────────────────────
public interface IGeolocationService
{
    double CalculateDistanceMeters(decimal lat1, decimal lon1, decimal lat2, decimal lon2);
    bool IsWithinRadius(decimal lat, decimal lon, decimal checkpointLat, decimal checkpointLon, int radiusMeters);
}

// ── Security ─────────────────────────────────────────────────
public interface ISecureRandomService
{
    string GenerateAnonymousId(int length = 12);
    string GenerateRedemptionCode(int length = 8);
    string GenerateQrCode(int length = 20);
    string GenerateFileHash(string input);
}

// ── Storage (Cloudflare R2) ───────────────────────────────────
/// <summary>
/// Abstracts Cloudflare R2 (S3-compatible) object storage.
/// </summary>
public interface IStorageService
{
    /// <summary>Uploads raw bytes and returns the public URL, or null if not configured.</summary>
    Task<string?> UploadAsync(byte[] data, string key, string contentType, CancellationToken ct = default);

    /// <summary>Deletes an object by key. Returns false if the operation fails.</summary>
    Task<bool> DeleteAsync(string key, CancellationToken ct = default);

    /// <summary>Returns the public URL for a given key.</summary>
    string GetPublicUrl(string key);

    /// <summary>Generates a pre-signed URL for direct client uploads.</summary>
    string GeneratePreSignedUrl(string key, string contentType, TimeSpan expiresIn);
}


// ── Email Service ────────────────────────────────────────────
public interface IEmailService
{
    Task<bool> SendEmailVerificationAsync(string toEmail, string fullName, string verificationToken, CancellationToken ct = default);
    Task<bool> SendPasswordResetAsync(string toEmail, string fullName, string resetToken, CancellationToken ct = default);
    Task<bool> SendWelcomeEmailAsync(string toEmail, string fullName, CancellationToken ct = default);
}

// ── Email Validation Service ─────────────────────────────────
public interface IEmailValidationService
{
    bool IsValidEmailFormat(string email);
    Task<bool> IsValidEmailDomainAsync(string email, CancellationToken ct = default);
}

