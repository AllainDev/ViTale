using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Application.Interfaces.Services;
using BCrypt.Net;

namespace Infrastructure.Services;

using Application.DTOs;

/// <summary>JWT generation and validation using HS256 with a configurable secret.</summary>
public class JwtAuthService : IAuthenticationService
{
    private const string TravelerIdClaim = "tid";
    private const string IsRegisteredClaim = "reg";
    private const string RoleClaim = "role";
    private const int TokenExpiryDays = 7;
    private const int RefreshWindowDays = 30;

    private readonly string _secret;
    private readonly ILogger<JwtAuthService> _logger;

    public JwtAuthService(ILogger<JwtAuthService> logger)
    {
        _secret = Environment.GetEnvironmentVariable("JWT_SECRET")
                  ?? throw new InvalidOperationException("JWT_SECRET is required");
        if (_secret.Length < 32)
            throw new InvalidOperationException("JWT_SECRET must be at least 32 characters");
        _logger = logger;
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(password, passwordHash);
        }
        catch
        {
            return false;
        }
    }

    public string GenerateJwt(Guid travelerId, string? email, bool isRegistered)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(TravelerIdClaim, travelerId.ToString()),
            new(IsRegisteredClaim, isRegistered.ToString().ToLowerInvariant()),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
        };

        if (!string.IsNullOrEmpty(email))
            claims.Add(new(JwtRegisteredClaimNames.Email, email));

        var token = new JwtSecurityToken(
            issuer: "vitale.vn",
            audience: "app.vitale.vn",
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddDays(TokenExpiryDays),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string GenerateAdminJwt(Guid adminId, string username)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(TravelerIdClaim, adminId.ToString()), // Reusing for ID
            new(RoleClaim, "Admin"),
            new(JwtRegisteredClaimNames.Name, username),
            new(JwtRegisteredClaimNames.Iat, DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
        };

        var token = new JwtSecurityToken(
            issuer: "vitale.vn",
            audience: "app.vitale.vn",
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddDays(1), // Admins get 1 day token
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public JwtValidationResult? ValidateJwt(string token)
    {
        try
        {
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_secret));
            var handler = new JwtSecurityTokenHandler();

            var parameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = key,
                ValidateIssuer = true,
                ValidIssuer = "vitale.vn",
                ValidateAudience = true,
                ValidAudience = "app.vitale.vn",
                ClockSkew = TimeSpan.FromMinutes(1),
                ValidateLifetime = false, // check manually for refresh window
            };

            var principal = handler.ValidateToken(token, parameters, out var validated);
            var jwt = (JwtSecurityToken)validated;

            // Token beyond refresh window is truly expired
            if (DateTime.UtcNow > jwt.IssuedAt.AddDays(TokenExpiryDays + RefreshWindowDays))
                return null;

            var travelerId = Guid.Parse(jwt.Claims.First(c => c.Type == TravelerIdClaim).Value);
            var emailOrUsername = jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Email)?.Value 
                                  ?? jwt.Claims.FirstOrDefault(c => c.Type == JwtRegisteredClaimNames.Name)?.Value
                                  ?? principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
            var isRegistered = bool.Parse(jwt.Claims.FirstOrDefault(c => c.Type == IsRegisteredClaim)?.Value ?? "false");
            var role = jwt.Claims.FirstOrDefault(c => c.Type == RoleClaim)?.Value ?? "Traveler";

            return new JwtValidationResult(travelerId, emailOrUsername, isRegistered, role, jwt.IssuedAt);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "JWT validation failed");
            return null;
        }
    }

    public async Task<OAuthValidationResult> ValidateOAuthTokenAsync(string provider, string token, CancellationToken ct = default)
    {
        return provider.ToUpperInvariant() switch
        {
            "GOOGLE"   => await ValidateGoogleTokenAsync(token, ct),
            "FACEBOOK" => await ValidateFacebookTokenAsync(token, ct),
            _ => new OAuthValidationResult(false, null, null, $"Unknown OAuth provider: {provider}")
        };
    }

    // ── Google ─────────────────────────────────────────────────────────────────
    // Validates the ID Token (JWT) issued by Google Sign-In via tokeninfo endpoint.
    private static async Task<OAuthValidationResult> ValidateGoogleTokenAsync(string accessToken, CancellationToken ct)
    {
        using var http = new HttpClient();
        // Use access_token parameter (not id_token) because @react-oauth/google implicit flow
        // returns an access_token, not a JWT id_token
        var response = await http.GetAsync(
            $"https://oauth2.googleapis.com/tokeninfo?access_token={Uri.EscapeDataString(accessToken)}", ct);

        if (!response.IsSuccessStatusCode)
            return new OAuthValidationResult(false, null, null, "Invalid Google ID token");

        var payload = await response.Content.ReadFromJsonAsync<GoogleTokenPayload>(ct);
        if (payload is null)
            return new OAuthValidationResult(false, null, null, "Empty Google token response");

        return new OAuthValidationResult(true, payload.sub, payload.email, null);
    }

    // ── Facebook ───────────────────────────────────────────────────────────────
    // Validates a Facebook user access token via Graph API /me endpoint.
    // The token must have the `email` permission granted by the user.
    private static async Task<OAuthValidationResult> ValidateFacebookTokenAsync(string accessToken, CancellationToken ct)
    {
        using var http = new HttpClient();
        var url = $"https://graph.facebook.com/me?fields=id,email&access_token={Uri.EscapeDataString(accessToken)}";
        var response = await http.GetAsync(url, ct);

        if (!response.IsSuccessStatusCode)
            return new OAuthValidationResult(false, null, null, "Invalid Facebook access token");

        var payload = await response.Content.ReadFromJsonAsync<FacebookTokenPayload>(ct);
        if (payload is null || string.IsNullOrEmpty(payload.id))
            return new OAuthValidationResult(false, null, null, "Empty Facebook token response");

        return new OAuthValidationResult(true, payload.id, payload.email, null);
    }

    private record GoogleTokenPayload(string sub, string? email, string? aud, long exp);
    private record FacebookTokenPayload(string id, string? email);
}

