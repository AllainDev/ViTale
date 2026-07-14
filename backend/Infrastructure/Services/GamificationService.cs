using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Domain.ValueObjects;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

/// <summary>
/// Implements XP awarding, level-up promotion, digital stamp management,
/// and the retroactive doll-bonus XP system.
/// </summary>
public class GamificationService : IGamificationService
{


    private readonly ApplicationDbContext _db;

    public GamificationService(ApplicationDbContext db)
    {
        _db = db;
    }

    // ── AwardXpAsync ──────────────────────────────────────────────────────────

    public async Task<XpAwardResult> AwardXpAsync(
        Guid userId, int xpAmount, XpSource source, CancellationToken ct = default)
    {
        var profile = await GetOrCreateProfileAsync(userId, ct);

        var prevXp = profile.TotalXp;
        var prevLevel = profile.CurrentLevel;

        profile.AddXp(xpAmount, source);

        // Check for level-up (may level multiple times in one go)
        var levelUpResult = profile.CheckLevelUp();

        return new XpAwardResult
        {
            PreviousXp = prevXp,
            NewXp = profile.TotalXp,
            PreviousLevel = prevLevel,
            NewLevel = profile.CurrentLevel,
            UnlockedVouchers = levelUpResult.Rewards?.ToList() ?? new()
        };
    }

    // ── CheckAndProcessLevelUpAsync ───────────────────────────────────────────

    public async Task<LevelUpResult> CheckAndProcessLevelUpAsync(
        Guid userId, CancellationToken ct = default)
    {
        var profile = await GetOrCreateProfileAsync(userId, ct);

        var result = profile.CheckLevelUp();

        if (result.LeveledUp)
            await _db.SaveChangesAsync(ct);

        return result;
    }

    // ── UnlockDigitalStampAsync ───────────────────────────────────────────────

    public async Task<StampUnlockResult> UnlockDigitalStampAsync(
        Guid userId, Guid checkpointId, bool hasDollBonus = false, CancellationToken ct = default)
    {
        var profile = await _db.UserGamificationProfiles
            .Include(p => p.Stamps)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile == null)
        {
            profile = UserGamificationProfile.Create(userId);
            _db.UserGamificationProfiles.Add(profile);
        }

        var existing = profile.Stamps.FirstOrDefault(s => s.CheckpointId == checkpointId);
        var isNew = existing == null;

        if (isNew)
        {
            var stamp = UserStamp.Create(userId, checkpointId, hasDollBonus);
            profile.Stamps.Add(stamp); // EF tracks via navigation
            _db.Set<UserStamp>().Add(stamp); // Force EF to treat it as a new entity
            profile.IncrementStamps();
        }
        else if (hasDollBonus && !existing!.HasDollBonus)
        {
            // Stamp already exists but doll bonus not yet marked
            existing.MarkDollBonusAcquired();
        }

        var checkpoint = await _db.Checkpoints
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == checkpointId, ct);

        return new StampUnlockResult
        {
            IsNew = isNew,
            CheckpointId = checkpointId,
            CheckpointName = checkpoint?.Name,
            UnlockedAt = DateTime.UtcNow,
            UnlockedStamps = new List<UserStampInfo>
            {
                new UserStampInfo
                {
                    CheckpointId = checkpointId,
                    CheckpointName = checkpoint?.Name,
                    UnlockedAt = DateTime.UtcNow
                }
            }
        };
    }

    // ── AwardDollBonusXpAsync ─────────────────────────────────────────────────

    /// <summary>
    /// Awards the 100 XP doll bonus retroactively for a checkpoint already visited.
    /// Returns 0 if the bonus was already awarded or no stamp exists.
    /// </summary>
    public async Task<int> AwardDollBonusXpAsync(
        Guid userId, Guid checkpointId, CancellationToken ct = default)
    {
        // Load the stamp to check status
        var stamp = await _db.UserStamps
            .FirstOrDefaultAsync(s => s.UserId == userId && s.CheckpointId == checkpointId, ct);

        if (stamp == null || stamp.HasDollBonus)
            return 0; // Already awarded or no stamp at all

        // Load profile with optimistic concurrency
        var profile = await GetOrCreateProfileAsync(userId, ct);

        stamp.MarkDollBonusAcquired();
        // Give the 100 XP bonus retroactively
        profile.AddXp(Domain.Constants.GamificationConstants.DollBonusXp, XpSource.Bonus);
        profile.CheckLevelUp();

        await _db.SaveChangesAsync(ct);

        return Domain.Constants.GamificationConstants.DollBonusXp;
    }

    // ── GetUserGamificationStatusAsync ────────────────────────────────────────

    public async Task<GamificationStatus> GetUserGamificationStatusAsync(
        Guid userId, CancellationToken ct = default)
    {
        var profile = await _db.UserGamificationProfiles
            .AsNoTracking()
            .Include(p => p.Stamps)
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile == null)
        {
            return new GamificationStatus
            {
                TotalXp = 0,
                CurrentLevel = 0,
                CheckinsCount = 0,
                StampsUnlocked = 0,
                BadgesEarned = 0,
                NextLevelXp = UserGamificationProfile.CalculateXpForLevel(1),
                Stamps = new List<UserStampInfo>()
            };
        }

        // Hydrate checkpoint names in one query
        var checkpointIds = profile.Stamps.Select(s => s.CheckpointId).ToList();
        var checkpointNames = await _db.Checkpoints
            .AsNoTracking()
            .Where(c => checkpointIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToDictionaryAsync(c => c.Id, c => c.Name, ct);

        var stamps = profile.Stamps
            .Select(s => new UserStampInfo
            {
                CheckpointId = s.CheckpointId,
                CheckpointName = checkpointNames.GetValueOrDefault(s.CheckpointId),
                UnlockedAt = s.UnlockedAt
            })
            .ToList();

        return new GamificationStatus
        {
            TotalXp = profile.TotalXp,
            CurrentLevel = profile.CurrentLevel,
            CheckinsCount = profile.CheckinsCount,
            StampsUnlocked = profile.StampsUnlocked,
            BadgesEarned = profile.BadgesEarned,
            NextLevelXp = UserGamificationProfile.CalculateXpForLevel(profile.CurrentLevel + 1),
            Stamps = stamps
        };
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    private async Task<UserGamificationProfile> GetOrCreateProfileAsync(
        Guid userId, CancellationToken ct)
    {
        var profile = await _db.UserGamificationProfiles
            .FirstOrDefaultAsync(p => p.UserId == userId, ct);

        if (profile != null) return profile;

        profile = UserGamificationProfile.Create(userId);
        _db.UserGamificationProfiles.Add(profile);
        // Don't save here — let the caller control the transaction.
        return profile;
    }
}
