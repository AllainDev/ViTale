namespace Domain.Entities;

/// <summary>
/// Represents a badge earned by a user (gamification profile ID).
/// Kept aligned with <see cref="TravelerBadge"/> for backward-compatibility.
/// </summary>
public class UserBadge
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public Guid BadgeId { get; private set; }
    public DateTime EarnedAt { get; private set; }

    // ── Navigation properties ────────────────────────────────────────
    public virtual Badge? Badge { get; private set; }
    public virtual UserGamificationProfile? Profile { get; private set; }

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
