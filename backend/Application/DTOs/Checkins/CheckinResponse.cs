namespace Application.DTOs;

public class CheckinResponse
{
    public bool Success { get; set; }

    // Checkpoint
    public Guid CheckpointId { get; set; }
    public string CheckpointName { get; set; } = string.Empty;
    public string CheckpointRegion { get; set; } = string.Empty;
    public string? StoryAssetUrl { get; set; }

    // XP & Level
    public int XpAwarded { get; set; }
    public int TotalXp { get; set; }
    public int CurrentLevel { get; set; }
    public int NextLevelXp { get; set; }
    public bool LeveledUp { get; set; }

    // Stamp
    public bool IsNewStamp { get; set; }
    public bool HasDollBonus { get; set; }

    // Doll info (only when token was used)
    public string? DollName { get; set; }
    public string? DollRegion { get; set; }

    // Error
    public string? ErrorMessage { get; set; }
    public string? ErrorCode { get; set; }
}

public class StampInfo
{
    public Guid CheckpointId { get; set; }
    public string? CheckpointName { get; set; }
    public DateTime UnlockedAt { get; set; }
}
