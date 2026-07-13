namespace Application.Interfaces.Services;

// ── Gamification Check-in Service ────────────────────────────

public interface ICheckinService
{
    /// <summary>
    /// Processes a GPS-based gamification check-in.
    /// <para>
    /// Flow:
    /// 1. Find nearest active checkpoint within 100m (Haversine).
    /// 2. Optionally validate a doll token (QR code) — must belong to same region as checkpoint.
    /// 3. Award XP (50 base, +100 doll bonus if eligible) with duplicate-protection.
    /// 4. Unlock digital stamp; mark HasDollBonus if applicable.
    /// 5. Check level-up.
    /// 6. Persist CheckinRecord.
    /// </para>
    /// </summary>
    Task<GamificationCheckinResult> ProcessGamificationCheckinAsync(
        Guid travelerId,
        decimal latitude,
        decimal longitude,
        double? accuracyMeters,
        Guid? checkpointId = null,
        CancellationToken ct = default);

    /// <summary>
    /// Validates a doll token and claims it for the user.
    /// If the user already has a stamp in the doll's region, retroactively awards 100 XP.
    /// </summary>
    Task<GamificationClaimDollResult> ClaimDollAsync(
        Guid travelerId,
        string dollToken,
        CancellationToken ct = default);
}

// ── Supporting records ────────────────────────────────────────

public record GamificationCheckinResult
{
    public bool Success { get; init; }

    // Checkpoint info
    public Guid CheckpointId { get; init; }
    public string CheckpointName { get; init; } = string.Empty;
    public string CheckpointRegion { get; init; } = string.Empty;
    public string? StoryAssetUrl { get; init; }

    // XP & leveling
    public int XpAwarded { get; init; }
    public int TotalXp { get; init; }
    public int CurrentLevel { get; init; }
    public int NextLevelXp { get; init; }
    public bool LeveledUp { get; init; }

    // Stamp
    public bool IsNewStamp { get; init; }
    public bool HasDollBonus { get; init; }

    // Doll info (when token was used)
    public string? DollName { get; init; }
    public string? DollRegion { get; init; }

    // Error (when Success = false)
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }
}

public record GamificationClaimDollResult
{
    public bool Success { get; init; }
    public string? ErrorMessage { get; init; }
    public string? ErrorCode { get; init; }

    public Guid? DollId { get; init; }
    public string? DollName { get; init; }
    public string? Region { get; init; }

    public bool RetroactiveBonusAwarded { get; init; }
    public int XpAwarded { get; init; }
    public int TotalXp { get; init; }
    public int CurrentLevel { get; init; }
    public bool LeveledUp { get; init; }
}
