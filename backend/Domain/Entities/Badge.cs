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
    public string ConditionValue { get; private set; } = "{}";

    // ── Navigation properties ────────────────────────────────────────
    public virtual ICollection<UserBadge> UserBadges { get; private set; } = new List<UserBadge>();

    protected Badge() { }
}


