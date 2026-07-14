namespace Application.Interfaces.Services;

using Application.DTOs;

public interface IAuthenticationService
{
    Task<OAuthValidationResult> ValidateOAuthTokenAsync(string provider, string token, CancellationToken ct = default);
    string GenerateJwt(Guid travelerId, string? email, bool isRegistered);
    string GenerateRefreshToken();
    string GenerateAdminJwt(Guid adminId, string username);
    JwtValidationResult? ValidateJwt(string token);
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
