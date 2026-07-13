using System;
using System.Collections.Generic;

namespace Application.DTOs;

public record StampUnlockResult
{
    /// <summary>True when this is the first time the stamp was unlocked for this user.</summary>
    public bool IsNew { get; init; }
    public Guid CheckpointId { get; init; }
    public string? CheckpointName { get; init; }
    public DateTime UnlockedAt { get; init; }
    public List<UserStampInfo> UnlockedStamps { get; init; } = new();
}
