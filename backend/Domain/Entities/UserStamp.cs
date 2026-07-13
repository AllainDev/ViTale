namespace Domain.Entities;

public class UserStamp
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid CheckpointId { get; private set; }
    public DateTime UnlockedAt { get; private set; }
    public bool HasDollBonus { get; private set; }

    // EF Core
    protected UserStamp() { }

    public UserStamp(Guid userId, Guid checkpointId, bool hasDollBonus = false)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        CheckpointId = checkpointId;
        UnlockedAt = DateTime.UtcNow;
        HasDollBonus = hasDollBonus;
    }

    public void MarkDollBonusAcquired()
    {
        HasDollBonus = true;
    }
}

