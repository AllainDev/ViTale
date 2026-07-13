namespace Application.DTOs;

public record RefreshTokenResponse(string Jwt, DateTime ExpiresAt);