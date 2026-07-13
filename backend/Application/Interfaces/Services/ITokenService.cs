using Domain.Entities;

namespace Application.Interfaces.Services;

using Application.DTOs;

// ── Token Service ────────────────────────────────────────────

public interface ITokenService
{
    /// <summary>
    /// Validates a doll token for the given user, claiming it atomically with
    /// optimistic concurrency control to prevent race conditions.
    /// </summary>
    Task<TokenValidationResult> ValidateTokenAsync(string token, Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Generates a new cryptographically secure 16-character alphanumeric token
    /// and associates it with the specified doll. Default expiry is 1 year.
    /// </summary>
    Task<TokenGenerationResult> GenerateTokenForDollAsync(Guid dollId, CancellationToken ct = default);

    /// <summary>
    /// Returns all tokens (claimed or unclaimed, used or unused) that belong
    /// to the given user's inventory.
    /// </summary>
    Task<TokenInventory> GetUserTokenInventoryAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Validates a doll token, enforces single-use, and verifies the token's
    /// region matches <paramref name="checkpointRegion"/>. Pass null to skip region check.
    /// </summary>
    Task<TokenValidationResult> ValidateTokenForRegionAsync(string token, Guid userId, string? checkpointRegion, CancellationToken ct = default);

    /// <summary>
    /// Returns the region string for a given doll (Product) ID. Null if not found.
    /// </summary>
    Task<string?> GetDollRegionPublicAsync(Guid dollId, CancellationToken ct = default);

    /// <summary>
    /// Revokes a token so it can no longer be used. The requesting user must
    /// be the current holder of the token.
    /// </summary>
    Task<bool> RevokeTokenAsync(string token, Guid userId, CancellationToken ct = default);
}

// ── Supporting records ───────────────────────────────────────

public record TokenValidationResult
{
    public bool IsValid { get; init; }
    public Guid? DollId { get; init; }
    public string? DollName { get; init; }
    public DateTime? TokenExpiry { get; init; }
    public string? ErrorMessage { get; init; }
}

public record TokenGenerationResult
{
    /// <summary>The generated 16-character alphanumeric token.</summary>
    public string Token { get; init; } = string.Empty;
    public DateTime GeneratedAt { get; init; }
    public DateTime ExpiresAt { get; init; }
}

public record TokenInventory
{
    public List<TokenInfo> Tokens { get; init; } = new();
}

public record TokenInfo
{
    public string Token { get; init; } = string.Empty;
    public Guid DollId { get; init; }
    public bool IsUsed { get; init; }
    public DateTime? ExpiresAt { get; init; }
}

