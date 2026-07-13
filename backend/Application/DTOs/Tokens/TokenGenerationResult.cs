using System;

namespace Application.DTOs;

public record TokenGenerationResult
{
    /// <summary>The generated 16-character alphanumeric token.</summary>
    public string Token { get; init; } = string.Empty;
    public DateTime GeneratedAt { get; init; }
    public DateTime ExpiresAt { get; init; }
}
