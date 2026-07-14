using Domain.Enums;
using Domain.ValueObjects;

namespace Domain.Entities;

/// <summary>
/// Tracks a traveler's gamification state: XP, level, stamp/badge counts,
/// and the audit trail of XP transactions.
/// </summary>
public class UserGamificationProfile
{
    public Guid Id { get; private set; }
    public Guid UserId { get; private set; }
    public int TotalXp { get; private set; }
    public int CurrentLevel { get; private set; }
    public int CheckinsCount { get; private set; }
    public int StampsUnlocked { get; private set; }
    public int BadgesEarned { get; private set; }
    public DateTime CreatedAt { get; private set; }
    public DateTime LastUpdatedAt { get; private set; }
    [System.ComponentModel.DataAnnotations.Timestamp]
    public byte[] RowVersion { get; private set; } = Array.Empty<byte>();

    // Navigation properties (populated by tasks 1.3 and 1.4)
    public virtual ICollection<UserStamp> Stamps { get; private set; } = new List<UserStamp>();
    public virtual ICollection<UserBadge> Badges { get; private set; } = new List<UserBadge>();
    public virtual ICollection<XpTransaction> XpTransactions { get; private set; } = new List<XpTransaction>();

    // EF Core constructor
    protected UserGamificationProfile() { }

    /// <summary>Creates a new gamification profile for the given user.</summary>
    public static UserGamificationProfile Create(Guid userId)
    {
        return new UserGamificationProfile
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            TotalXp = 0,
            CurrentLevel = 0,
            CheckinsCount = 0,
            StampsUnlocked = 0,
            BadgesEarned = 0,
            CreatedAt = DateTime.UtcNow,
            LastUpdatedAt = DateTime.UtcNow
        };
    }

    /// <summary>
    /// Adds <paramref name="xpAmount"/> XP to the profile and records an
    /// <see cref="XpTransaction"/> for the audit trail.
    /// </summary>
    /// <param name="xpAmount">Must be a positive value; XP never decreases.</param>
    /// <param name="source">The reason XP is being awarded.</param>
    public void AddXp(int xpAmount, XpSource source)
    {
        if (xpAmount <= 0)
            throw new ArgumentException("XP amount must be positive.", nameof(xpAmount));

        TotalXp += xpAmount;
        LastUpdatedAt = DateTime.UtcNow;
        var transaction = XpTransaction.Create(Id, xpAmount, source);
        XpTransactions.Add(transaction);
    }

    /// <summary>
    /// Increments <see cref="CheckinsCount"/> by one.
    /// Call this each time the traveler successfully checks in.
    /// </summary>
    public void IncrementCheckins()
    {
        CheckinsCount++;
        LastUpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Increments <see cref="StampsUnlocked"/> by one.
    /// Call this when a new <see cref="UserStamp"/> is created for this traveler.
    /// </summary>
    public void IncrementStamps()
    {
        StampsUnlocked++;
        LastUpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Checks whether the traveler's current XP satisfies the next level threshold
    /// and, if so, promotes the level by one.
    /// <para>
    /// Formula: Level = max{ L | TotalXP ≥ 100 × L^1.5 }
    /// </para>
    /// </summary>
    /// <returns>
    /// A <see cref="LevelUpResult"/> that reports whether a level-up occurred,
    /// the old/new levels, and any voucher rewards unlocked.
    /// </returns>
    public LevelUpResult CheckLevelUp()
    {
        var nextLevelXp = CalculateXpForLevel(CurrentLevel + 1);

        if (TotalXp >= nextLevelXp)
        {
            var oldLevel = CurrentLevel;
            CurrentLevel++;
            LastUpdatedAt = DateTime.UtcNow;

            var rewards = GetLevelUpRewards(CurrentLevel);
            return new LevelUpResult(true, oldLevel, CurrentLevel, rewards);
        }

        return new LevelUpResult(false, CurrentLevel, CurrentLevel, Array.Empty<VoucherReward>());
    }

    /// <summary>
    /// Returns the minimum XP required to reach <paramref name="level"/>.
    /// Formula: threshold(L) = 100 × L^1.5
    /// </summary>
    public static int CalculateXpForLevel(int level)
    {
        if (level <= 0) return 0;
        return (int)(100 * Math.Pow(level, 1.5));
    }

    // Reward lookup — will be extended when the voucher reward service is wired in (task 3.2).
    private static IReadOnlyList<VoucherReward> GetLevelUpRewards(int newLevel)
    {
        // Placeholder: no automatic rewards until the voucher engine is integrated.
        return Array.Empty<VoucherReward>();
    }
}
