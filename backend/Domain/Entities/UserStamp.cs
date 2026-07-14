namespace Domain.Entities;

public class UserStamp
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid CheckpointId { get; private set; }
    public DateTime UnlockedAt { get; private set; }
    public bool HasDollBonus { get; private set; }

    // ── Navigation properties ────────────────────────────────────────
    public virtual Checkpoint? Checkpoint { get; private set; }
    public virtual UserGamificationProfile? Profile { get; private set; }

    // EF Core
    protected UserStamp() { }

    public static UserStamp Create(Guid userId, Guid checkpointId, bool hasDollBonus = false)
    {
        return new UserStamp
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            CheckpointId = checkpointId,
            UnlockedAt = DateTime.UtcNow,
            HasDollBonus = hasDollBonus
        };
    }

    public void MarkDollBonusAcquired()
    {
        HasDollBonus = true;
    }

    /// <summary>
    /// Reassigns this stamp to a different user (migration only).
    /// Used when an anonymous traveler's data is merged into a persistent account on login.
    /// </summary>
    public void ReassignUser(Guid newUserId)
    {
        UserId = newUserId;
    }
}
