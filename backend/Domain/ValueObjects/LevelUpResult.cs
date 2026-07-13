namespace Domain.ValueObjects;

/// <summary>Result returned by <c>UserGamificationProfile.CheckLevelUp()</c>.</summary>
public sealed record LevelUpResult(
    bool LeveledUp,
    int OldLevel,
    int NewLevel,
    IReadOnlyList<VoucherReward> Rewards);
