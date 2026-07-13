using System.Text.Json;
using Domain.Enums;

namespace Domain.Entities;

public class Badge
{
    public Guid Id { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string ImageUrl { get; private set; } = string.Empty;
    public ConditionType ConditionType { get; private set; }
    public JsonDocument ConditionValue { get; private set; } = JsonDocument.Parse("{}");

    protected Badge() { }
}

public class TravelerBadge
{
    public Guid TravelerId { get; private set; }
    public Guid BadgeId { get; private set; }
    public DateTime EarnedAt { get; private set; }

    public Badge? Badge { get; private set; }

    protected TravelerBadge() { }

    public static TravelerBadge Create(Guid travelerId, Guid badgeId)
    {
        return new TravelerBadge
        {
            TravelerId = travelerId,
            BadgeId = badgeId,
            EarnedAt = DateTime.UtcNow
        };
    }
}

