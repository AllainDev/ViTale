using System.Security.Cryptography;
using System.Text;
using Application.Interfaces.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

/// <summary>
/// Token service implementing cryptographically secure token generation
/// and validation with optimistic concurrency control for race condition protection.
/// </summary>
public class TokenService : ITokenService
{
    private readonly ApplicationDbContext _db;

    public TokenService(ApplicationDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Generates a cryptographically secure 16-character alphanumeric token
    /// and associates it with the specified doll. Default expiry is 1 year.
    /// Ensures token uniqueness by regenerating if collision detected.
    /// </summary>
    public async Task<TokenGenerationResult> GenerateTokenForDollAsync(Guid dollId, CancellationToken ct = default)
    {
        const int maxAttempts = 10;
        
        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            var token = GenerateSecureToken();
            
            // Check if token already exists (should be extremely rare with 16 alphanumeric chars)
            var exists = await _db.DollTokens.AnyAsync(t => t.Token == token, ct);
            
            if (!exists)
            {
                var expiresAt = DateTime.UtcNow.AddYears(1);
                var dollToken = new DollToken(dollId, token, expiresAt);
                
                _db.DollTokens.Add(dollToken);
                await _db.SaveChangesAsync(ct);
                
                return new TokenGenerationResult
                {
                    Token = token,
                    GeneratedAt = dollToken.GeneratedAt,
                    ExpiresAt = expiresAt
                };
            }
        }
        
        throw new InvalidOperationException("Failed to generate unique token after maximum attempts");
    }

    /// <summary>
    /// Validates a doll token for the given user and checkpoint region.
    /// Immediately marks the token as Used (single-use) with optimistic concurrency.
    /// </summary>
    public async Task<TokenValidationResult> ValidateTokenAsync(string token, Guid userId, CancellationToken ct = default)
        => await ValidateTokenForRegionAsync(token, userId, checkpointRegion: null, ct);

    /// <summary>
    /// Validates a doll token, enforces single-use, and verifies the token's
    /// product region matches the checkpoint region. Returns DollName and DollRegion.
    /// </summary>
    public async Task<TokenValidationResult> ValidateTokenForRegionAsync(
        string token, Guid userId, string? checkpointRegion, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length != 16)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Invalid token format"
            };
        }

        // Retrieve token including expiry check
        var tokenEntity = await _db.DollTokens
            .FirstOrDefaultAsync(t => t.Token == token && t.ExpiresAt > DateTime.UtcNow, ct);

        if (tokenEntity == null)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token not found or expired"
            };
        }

        // Single-use enforcement
        if (tokenEntity.IsUsed)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token already used"
            };
        }

        // Check if already claimed by another user
        if (tokenEntity.UserId.HasValue && tokenEntity.UserId != userId)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token already claimed by another user"
            };
        }

        // Resolve the product associated with this doll to get Region
        var dollRegion = await GetDollRegionAsync(tokenEntity.DollId, ct);
        var dollName   = await GetDollNameAsync(tokenEntity.DollId, ct);

        // Region enforcement: doll must belong to the same region as the checkpoint
        if (checkpointRegion != null && dollRegion != null &&
            !string.Equals(dollRegion, checkpointRegion, StringComparison.OrdinalIgnoreCase))
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Doll region '{dollRegion}' does not match checkpoint region '{checkpointRegion}'"
            };
        }

        try
        {
            // Claim (if not yet claimed) and immediately mark as Used — single-use token
            if (!tokenEntity.UserId.HasValue)
                tokenEntity.Claim(userId);

            tokenEntity.MarkAsUsed();
            await _db.SaveChangesAsync(ct); // throws DbUpdateConcurrencyException on race

            return new TokenValidationResult
            {
                IsValid = true,
                DollId = tokenEntity.DollId,
                DollName = dollName,
                TokenExpiry = tokenEntity.ExpiresAt
            };
        }
        catch (DbUpdateConcurrencyException)
        {
            return new TokenValidationResult
            {
                IsValid = false,
                ErrorMessage = "Token already claimed by another user"
            };
        }
    }


    /// <summary>
    /// Returns all tokens (claimed or unclaimed, used or unused) that belong
    /// to the given user's inventory.
    /// </summary>
    public async Task<TokenInventory> GetUserTokenInventoryAsync(Guid userId, CancellationToken ct = default)
    {
        var userTokens = await _db.DollTokens
            .Where(t => t.UserId == userId)
            .Select(t => new TokenInfo
            {
                Token = t.Token,
                DollId = t.DollId,
                IsUsed = t.IsUsed,
                ExpiresAt = t.ExpiresAt
            })
            .ToListAsync(ct);

        return new TokenInventory
        {
            Tokens = userTokens
        };
    }

    /// <summary>
    /// Revokes a token so it can no longer be used. The requesting user must
    /// be the current holder of the token.
    /// </summary>
    public async Task<bool> RevokeTokenAsync(string token, Guid userId, CancellationToken ct = default)
    {
        var tokenEntity = await _db.DollTokens
            .FirstOrDefaultAsync(t => t.Token == token && t.UserId == userId, ct);

        if (tokenEntity == null)
        {
            return false; // Token not found or not owned by user
        }

        if (tokenEntity.IsUsed)
        {
            return false; // Already used, cannot revoke
        }

        // Mark as used to effectively revoke it
        tokenEntity.MarkAsUsed();
        await _db.SaveChangesAsync(ct);

        return true;
    }

    /// <summary>
    /// Generates a cryptographically secure 16-character alphanumeric token.
    /// Uses RandomNumberGenerator for cryptographic randomness.
    /// </summary>
    private static string GenerateSecureToken()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const int tokenLength = 16;

        using var rng = RandomNumberGenerator.Create();
        var data = new byte[tokenLength];
        rng.GetBytes(data);

        var result = new StringBuilder(tokenLength);
        foreach (var b in data)
        {
            result.Append(chars[b % chars.Length]);
        }

        return result.ToString();
    }

    /// <summary>
    /// Public helper: resolves the region string for a given doll (Product) ID.
    /// Used by CheckinService to populate the response DollRegion field.
    /// </summary>
    public Task<string?> GetDollRegionPublicAsync(Guid dollId, CancellationToken ct)
        => GetDollRegionAsync(dollId, ct);

    /// <summary>
    /// Retrieves the doll name via the Product entity (DollId maps to Product.Id).
    /// </summary>
    private async Task<string?> GetDollNameAsync(Guid dollId, CancellationToken ct)
    {
        // DollToken.DollId corresponds to Product.Id (the physical doll product)
        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dollId, ct);

        return product != null ? $"Búp bê {product.Region}" : $"Doll-{dollId:N}";
    }

    /// <summary>
    /// Retrieves the region associated with the doll product.
    /// </summary>
    private async Task<string?> GetDollRegionAsync(Guid dollId, CancellationToken ct)
    {
        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dollId, ct);

        return product?.Region;
    }
}

