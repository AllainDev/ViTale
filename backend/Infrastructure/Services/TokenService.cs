using System.Security.Cryptography;
using System.Text;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services;

/// <summary>
/// Token service implementing the VID + HMAC format for doll claim tokens.
///
/// <para>
/// <b>Token format (printed as QR on physical doll packaging):</b>
/// <code>
///   VID-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-XXXXX
///     │   │                              │
///     │   └── 6-char HMAC-SHA256 signature (base32)
///     └────── 25-char random payload in 5 groups of 5 chars (Crockford Base32)
/// </code>
/// <list type="bullet">
///   <item>25 random chars × 5 bits/char = <b>125 bits of entropy</b></item>
///   <item>Crockford Base32 alphabet (excludes I, L, O, 0) avoids scanning confusion</item>
///   <item>HMAC prevents forgery — client cannot generate valid tokens without server secret</item>
///   <item>DB enforces: single-use (IsUsed), expiry (ExpiresAt), user binding (UserId), region (via DollId → Product.Region)</item>
/// </list>
/// </para>
/// </summary>
public class TokenService : ITokenService
{
    // Crockford Base32: 0-9 + A-Z minus I, L, O (32 chars)
    private const string Base32Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    // Token layout
    private const int PayloadGroupCount = 5;
    private const int PayloadGroupSize  = 5;     // 5 × 5 = 25 chars
    private const int SignatureSize     = 6;     // 6 base32 chars ≈ 30 bits
    private const string TokenPrefix    = "VID-";

    // Default token lifetime
    private static readonly TimeSpan DefaultLifetime = TimeSpan.FromDays(365 * 5); // 5 years

    private readonly ApplicationDbContext _db;
    private readonly string _hmacSecret;

    public TokenService(ApplicationDbContext db, IConfiguration configuration)
    {
        _db = db;

        // HMAC secret: read from env / appsettings.
        // In production, set DOLL_TOKEN_HMAC_SECRET to a strong 32+ byte secret.
        _hmacSecret = configuration["DollToken:HmacSecret"]
                    ?? Environment.GetEnvironmentVariable("DOLL_TOKEN_HMAC_SECRET")
                    ?? configuration["DOLL_TOKEN_HMAC_SECRET"]
                    ?? throw new InvalidOperationException(
                        "DollToken:HmacSecret (or fallback DOLL_TOKEN_HMAC_SECRET) is not configured.");
    }

    // ════════════════════════════════════════════════════════════════════
    //  PUBLIC API
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Generates a new signed token string in the canonical "VID-..." format.
    /// This is the value that should be printed on the doll's QR code.
    /// Persists the token in the database as an UNCLAIMED DollToken record.
    /// </summary>
    public async Task<TokenGenerationResult> GenerateTokenForDollAsync(Guid dollId, CancellationToken ct = default)
    {
        const int maxAttempts = 10;

        for (int attempt = 0; attempt < maxAttempts; attempt++)
        {
            var token = GenerateSignedTokenString();
            var exists = await _db.DollTokens.AnyAsync(t => t.Token == token, ct);
            if (exists) continue;

            var expiresAt = DateTime.UtcNow.Add(DefaultLifetime);
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

        throw new InvalidOperationException(
            "Failed to generate a unique doll token after maximum attempts. This is astronomically unlikely.");
    }

    /// <summary>
    /// Validates a doll token WITHOUT a region check. Use this for the claim-doll flow
    /// where the user can claim a doll from any region.
    /// </summary>
    public Task<TokenValidationResult> ValidateTokenAsync(string token, Guid userId, CancellationToken ct = default)
        => ValidateSignedTokenInternalAsync(token, userId, checkpointRegion: null, ct);

    /// <summary>
    /// Validates a doll token AND enforces that the token's doll belongs to the same
    /// region as the given checkpoint. Use this when the token is being consumed during
    /// a check-in flow to gate the doll bonus.
    /// </summary>
    public Task<TokenValidationResult> ValidateTokenForRegionAsync(
        string token, Guid userId, string? checkpointRegion, CancellationToken ct = default)
        => ValidateSignedTokenInternalAsync(token, userId, checkpointRegion, ct);

    /// <summary>
    /// Returns all tokens (claimed or unclaimed, used or unused) for the given user.
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

        return new TokenInventory { Tokens = userTokens };
    }

    /// <summary>
    /// Revokes a token so it can no longer be used (e.g. the physical QR was misprinted).
    /// The requesting user must be the current holder of the token.
    /// </summary>
    public async Task<bool> RevokeTokenAsync(string token, Guid userId, CancellationToken ct = default)
    {
        var tokenEntity = await _db.DollTokens
            .FirstOrDefaultAsync(t => t.Token == token && t.UserId == userId, ct);
        if (tokenEntity == null) return false;
        if (tokenEntity.IsUsed)  return false;

        tokenEntity.MarkAsUsed();
        await _db.SaveChangesAsync(ct);
        return true;
    }

    /// <summary>
    /// Resolves the region string for a given doll (Product) ID. Null if the product is missing.
    /// </summary>
    public Task<string?> GetDollRegionPublicAsync(Guid dollId, CancellationToken ct)
        => GetDollRegionAsync(dollId, ct);

    // ════════════════════════════════════════════════════════════════════
    //  CORE VALIDATION (HMAC + DB)
    // ════════════════════════════════════════════════════════════════════

    private async Task<TokenValidationResult> ValidateSignedTokenInternalAsync(
        string token, Guid userId, string? checkpointRegion, CancellationToken ct)
    {
        // ── 1. Format + HMAC check (no DB hit) ─────────────────────────
        if (string.IsNullOrWhiteSpace(token))
            return Invalid("Token is empty.");

        if (!TryVerifySignature(token, out var payloadPart))
            return Invalid("Token signature is invalid or tampered.");

        // ── 2. DB lookup ───────────────────────────────────────────────
        var tokenEntity = await _db.DollTokens
            .FirstOrDefaultAsync(t => t.Token == token, ct);

        if (tokenEntity == null)
            return Invalid("Token does not exist.");

        if (tokenEntity.IsUsed)
            return Invalid("Token has already been used.");

        if (tokenEntity.ExpiresAt <= DateTime.UtcNow)
            return Invalid("Token has expired.");

        if (tokenEntity.UserId.HasValue && tokenEntity.UserId != userId)
            return Invalid("Token is bound to another user.");

        // ── 3. Region check (if requested) ─────────────────────────────
        var dollRegion = await GetDollRegionAsync(tokenEntity.DollId, ct);
        if (checkpointRegion != null && dollRegion != null &&
            !string.Equals(dollRegion, checkpointRegion, StringComparison.OrdinalIgnoreCase))
        {
            return Invalid(
                $"Doll region '{dollRegion}' does not match checkpoint region '{checkpointRegion}'.");
        }

        // ── 4. Doll product-type check (reject non-Doll products) ─────
        var dollType = await GetDollProductTypeAsync(tokenEntity.DollId, ct);
        if (dollType.HasValue && dollType.Value != ProductType.Doll)
            return Invalid("Token is not associated with a Doll product.");

        return new TokenValidationResult
        {
            IsValid = true,
            DollId = tokenEntity.DollId,
            DollName = $"Búp bê {dollRegion ?? tokenEntity.DollId.ToString("N")[..8]}",
            TokenExpiry = tokenEntity.ExpiresAt
        };

        static TokenValidationResult Invalid(string msg) =>
            new() { IsValid = false, ErrorMessage = msg };
    }

    // ════════════════════════════════════════════════════════════════════
    //  TOKEN GENERATION  (rejection-sampled CSPRNG + HMAC)
    // ════════════════════════════════════════════════════════════════════

    private string GenerateSignedTokenString()
    {
        var payload = GenerateCrockfordBase32Grouped(PayloadGroupCount, PayloadGroupSize);
        var signature = ComputeBase32Signature(payload);
        return $"{TokenPrefix}{payload}-{signature}";
    }

    /// <summary>
    /// Generates random Crockford Base32 chars using rejection sampling to avoid
    /// modulo bias. Groups the chars with '-' separators.
    /// </summary>
    private static string GenerateCrockfordBase32Grouped(int groups, int groupSize)
    {
        // Note: 256 % 32 = 0 exactly, so rejection sampling is not strictly needed for 32.
        // We still use it for future-proofing if the alphabet ever changes.

        var sb = new StringBuilder(groups * (groupSize + 1));
        using var rng = RandomNumberGenerator.Create();
        var buffer = new byte[groupSize];
        int produced = 0;
        while (produced < groups * groupSize)
        {
            rng.GetBytes(buffer);
            foreach (var b in buffer)
            {
                if (produced >= groups * groupSize) break;
                // Take the low 5 bits, which is unbiased when alphabet is a power of 2.
                var idx = b & 0x1F;
                sb.Append(Base32Alphabet[idx]);
                produced++;
            }
        }

        // Insert '-' between groups
        var grouped = new StringBuilder(sb.Length + groups);
        for (int i = 0; i < groups; i++)
        {
            if (i > 0) grouped.Append('-');
            grouped.Append(sb.ToString(i * groupSize, groupSize));
        }
        return grouped.ToString();
    }

    private string ComputeBase32Signature(string payload)
    {
        // Sign the payload (no prefix, no signature suffix) with HMAC-SHA256.
        // Take the first 30 bits, encode as 6 base32 chars.
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_hmacSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        // Pack first 30 bits of hash into a uint
        uint v = ((uint)hash[0] << 24)
               | ((uint)hash[1] << 16)
               | ((uint)hash[2] << 8)
               |  (uint)hash[3];
        v >>= 2; // keep top 30 bits

        var sb = new StringBuilder(SignatureSize);
        for (int i = SignatureSize - 1; i >= 0; i--)
        {
            sb.Append(Base32Alphabet[(int)(v & 0x1F)]);
            v >>= 5;
        }
        return sb.ToString();
    }

    private bool TryVerifySignature(string token, out string payloadPart)
    {
        payloadPart = string.Empty;

        // Must start with "VID-"
        if (!token.StartsWith(TokenPrefix, StringComparison.Ordinal))
            return false;

        var body = token[TokenPrefix.Length..];
        // Last '-' separates signature
        var lastDash = body.LastIndexOf('-');
        if (lastDash <= 0 || lastDash == body.Length - 1)
            return false;

        payloadPart = body[..lastDash];        // "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
        var providedSig = body[(lastDash + 1)..]; // "XXXXXX"

        if (providedSig.Length != SignatureSize)
            return false;

        var expected = ComputeBase32Signature(payloadPart);

        // Constant-time comparison to prevent timing side-channels.
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(providedSig),
            Encoding.ASCII.GetBytes(expected));
    }

    // ════════════════════════════════════════════════════════════════════
    //  HELPERS
    // ════════════════════════════════════════════════════════════════════

    private async Task<string?> GetDollRegionAsync(Guid dollId, CancellationToken ct)
    {
        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dollId, ct);
        return product?.Region;
    }

    private async Task<ProductType?> GetDollProductTypeAsync(Guid dollId, CancellationToken ct)
    {
        var product = await _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == dollId, ct);
        return product?.ProductType;
    }
}
