using Domain.Enums;
using Domain.ValueObjects;

namespace Application.Interfaces.Services;

// ── Gamification Service ──────────────────────────────────────

public interface IGamificationService
{
    /// <summary>
    /// Awards the specified amount of XP to a user and records the transaction.
    /// XP is always additive; it never decreases.
    /// </summary>
    Task<XpAwardResult> AwardXpAsync(Guid userId, int xpAmount, XpSource source, CancellationToken ct = default);

    /// <summary>
    /// Evaluates whether the user's current XP satisfies the next level threshold
    /// (formula: 100 × L^1.5) and, if so, promotes the level and distributes
    /// any voucher rewards for that level.
    /// </summary>
    Task<LevelUpResult> CheckAndProcessLevelUpAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Unlocks the digital stamp for <paramref name="checkpointId"/> on the user's
    /// passport. If the stamp is already present, the operation is a no-op
    /// (deduplication is enforced). Optionally marks HasDollBonus on the stamp.
    /// </summary>
    Task<StampUnlockResult> UnlockDigitalStampAsync(Guid userId, Guid checkpointId, bool hasDollBonus = false, CancellationToken ct = default);

    /// <summary>
    /// Awards the 100 XP doll bonus to a user for a checkpoint where they have
    /// already checked in normally (Retroactive XP). Only succeeds if:
    /// - The stamp exists for this checkpoint AND
    /// - HasDollBonus is false on the stamp.
    /// Returns 0 if the bonus has already been awarded.
    /// </summary>
    Task<int> AwardDollBonusXpAsync(Guid userId, Guid checkpointId, CancellationToken ct = default);

    /// <summary>
    /// Returns the full gamification profile for the user: XP, level, counts,
    /// earned stamps, and the XP required for the next level.
    /// </summary>
    Task<GamificationStatus> GetUserGamificationStatusAsync(Guid userId, CancellationToken ct = default);
}


// ── Supporting records ────────────────────────────────────────

public record XpAwardResult
{
    public int PreviousXp { get; init; }
    public int NewXp { get; init; }
    public int PreviousLevel { get; init; }
    public int NewLevel { get; init; }
    public List<VoucherReward> UnlockedVouchers { get; init; } = new();
}

public record StampUnlockResult
{
    /// <summary>True when this is the first time the stamp was unlocked for this user.</summary>
    public bool IsNew { get; init; }
    public Guid CheckpointId { get; init; }
    public string? CheckpointName { get; init; }
    public DateTime UnlockedAt { get; init; }
    public List<UserStampInfo> UnlockedStamps { get; init; } = new();
}

public record UserStampInfo
{
    public Guid CheckpointId { get; init; }
    public string? CheckpointName { get; init; }
    public DateTime UnlockedAt { get; init; }
}

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
