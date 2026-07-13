namespace Application.DTOs;

public class GamificationStatusResponse
{
    public int TotalXp { get; set; }
    public int CurrentLevel { get; set; }
    public int CheckinsCount { get; set; }
    public int StampsUnlocked { get; set; }
    public int BadgesEarned { get; set; }
    public int NextLevelXp { get; set; }
    public List<StampDetail> Stamps { get; set; } = new();
    public List<DollDetail> OwnedDolls { get; set; } = new();
}

public class StampDetail
{
    public Guid CheckpointId { get; set; }
    public string? CheckpointName { get; set; }
    public DateTime UnlockedAt { get; set; }
    public bool HasDollBonus { get; set; }
}

public class DollDetail
{
    public Guid Id { get; set; }
    public string Region { get; set; } = string.Empty;
    public string? Sku { get; set; }
    public DateTime ClaimedAt { get; set; }
}
