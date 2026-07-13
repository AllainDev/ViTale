namespace Application.Interfaces.Services;

// ── AI Chat ─────────────────────────────────────────────────
public interface IAiChatService
{
    Task<AiChatResponse> SendMessageAsync(AiChatRequest request, CancellationToken ct = default);
    Task<string?> SummarizeConversationAsync(string conversationHistory, CancellationToken ct = default);
}

public record AiChatRequest(
    string SystemPrompt,
    IReadOnlyList<(string Role, string Content)> Messages,
    int MaxTokens = 300);

public record AiChatResponse(
    string Text,
    string[] ActionTags);

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

public record OAuthValidationResult(
    bool IsValid,
    string? OAuthUserId,
    string? Email,
    string? Error);

public record JwtValidationResult(
    Guid Id,
    string? EmailOrUsername,
    bool IsRegistered,
    string Role,
    DateTime IssuedAt);

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
