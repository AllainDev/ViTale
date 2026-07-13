using System;

namespace Application.DTOs;

public record TokenInfo
{
    public string Token { get; init; } = string.Empty;
    public Guid DollId { get; init; }
    public bool IsUsed { get; init; }
    public DateTime? ExpiresAt { get; init; }
}
