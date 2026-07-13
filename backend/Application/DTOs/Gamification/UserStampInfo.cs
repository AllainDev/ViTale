using System;

namespace Application.DTOs;

public record UserStampInfo
{
    public Guid CheckpointId { get; init; }
    public string? CheckpointName { get; init; }
    public DateTime UnlockedAt { get; init; }
}
