namespace Domain.Entities;

/// <summary>
/// Represents a badge earned by a traveler.
/// Full implementation will be added in the badges task.
/// </summary>
public class UserBadge
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid BadgeId { get; private set; }
    public DateTime EarnedAt { get; private set; }

    // EF Core
    protected UserBadge() { }

    public UserBadge(Guid userId, Guid badgeId)
    {
        Id = Guid.NewGuid();
        UserId = userId;
        BadgeId = badgeId;
        EarnedAt = DateTime.UtcNow;
    }
}
