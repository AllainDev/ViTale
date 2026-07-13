namespace Application.DTOs;

public record OAuthValidationResult(
    bool IsValid,
    string? OAuthUserId,
    string? Email,
    string? Error);
