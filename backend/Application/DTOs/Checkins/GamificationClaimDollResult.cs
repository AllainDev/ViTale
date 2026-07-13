namespace Application.DTOs;

public record GamificationClaimDollResult(
    bool Success,
    string Message,
    string? DollName,
    string? Region);
