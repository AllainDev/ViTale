using System.Collections.Generic;

namespace Application.DTOs;

public record GamificationStatus
{
    public int TotalXp { get; init; }
    public int CurrentLevel { get; init; }
    public int CheckinsCount { get; init; }
    public int StampsUnlocked { get; init; }
    public int BadgesEarned { get; init; }
    /// <summary>XP required to reach the next level (100 × (CurrentLevel+1)^1.5).</summary>
    public int NextLevelXp { get; init; }
    public List<UserStampInfo> Stamps { get; init; } = new();
}
