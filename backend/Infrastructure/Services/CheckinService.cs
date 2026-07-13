using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Services;

/// <summary>
/// Orchestrates the gamification GPS check-in flow:
/// GPS validation → token validation → XP awarding → stamp unlocking → checkin persistence.
/// </summary>
public class CheckinService : ICheckinService
{
    private const int MaxCheckinRadiusMeters = 100;
    private const int BaseCheckinXp = 50;
    private const int DollBonusXp = 100;

    private readonly ApplicationDbContext _db;
    private readonly IGamificationService _gamification;
    private readonly IGeolocationService _geo;
    private readonly ITokenService _tokenService;

    public CheckinService(
        ApplicationDbContext db,
        IGamificationService gamification,
        IGeolocationService geo,
        ITokenService tokenService)
    {
        _db = db;
        _gamification = gamification;
        _geo = geo;
        _tokenService = tokenService;
    }

    public async Task<GamificationCheckinResult> ProcessGamificationCheckinAsync(
        Guid travelerId,
        decimal latitude,
        decimal longitude,
        double? accuracyMeters,
        Guid? checkpointId = null,
        CancellationToken ct = default)
    {
        // ── 1. Validate GPS coordinates ──────────────────────────────────────
        if (latitude < -90 || latitude > 90)
            return Error("Invalid latitude — must be between -90 and 90.", "INVALID_COORDS");
        if (longitude < -180 || longitude > 180)
            return Error("Invalid longitude — must be between -180 and 180.", "INVALID_COORDS");

        // ── 2. Find active checkpoint within its own effective radius ─────────
        // Each checkpoint has its own configured Radius (range 80–500m). The effective
        // radius used for matching the GPS fix is checkpoint.Radius plus an accuracy
        // buffer: when the device reports a less accurate GPS fix, we forgive more
        // distance. When the fix is accurate, we trust the configured Radius as-is.
        // This replaces the previous logic that capped every check at MaxCheckinRadiusMeters
        // and shrank the radius when accuracy was high — which caused valid nearby check-ins
        // (e.g. "Nhà của bạn" at 100m) to fail.
        var activeCheckpointsQuery = _db.Checkpoints.AsNoTracking().Where(c => c.IsActive);
        if (checkpointId.HasValue)
        {
            activeCheckpointsQuery = activeCheckpointsQuery.Where(c => c.Id == checkpointId.Value);
        }
        
        var activeCheckpoints = await activeCheckpointsQuery.ToListAsync(ct);

        var candidates = activeCheckpoints
            .Select(c => new
            {
                Checkpoint = c,
                DistanceMeters = _geo.CalculateDistanceMeters(latitude, longitude, c.Latitude, c.Longitude),
                // Per-checkpoint effective radius: own Radius (+ accuracy buffer if reported).
                EffectiveRadius = accuracyMeters.HasValue
                    ? c.Radius + (int)Math.Ceiling(accuracyMeters.Value)
                    : c.Radius
            })
            .ToList();

        var nearest = candidates
            .Where(x => x.DistanceMeters <= x.EffectiveRadius)
            .OrderBy(x => x.DistanceMeters)
            .FirstOrDefault();

        if (nearest == null)
        {
            var closest = candidates.OrderBy(x => x.DistanceMeters).FirstOrDefault();
            var msg = closest != null
                ? $"No checkpoints within reach of your location. You are about {Math.Round(closest.DistanceMeters)}m from the nearest checkpoint ({closest.Checkpoint.Name}), but its radius is {closest.Checkpoint.Radius}m."
                : "No checkpoints within reach of your location.";
            return Error(msg, "OUT_OF_RANGE");
        }

        var checkpoint = nearest.Checkpoint;

        // ── 3. Determine XP to award based on stamp history ──────────────────
        var existingStamp = await _db.UserStamps
            .FirstOrDefaultAsync(s => s.UserId == travelerId && s.CheckpointId == checkpoint.Id, ct);

        bool isFirstCheckin = existingStamp == null;
        bool alreadyHasDollBonus = existingStamp?.HasDollBonus ?? false;

        // Check if user owns an activated doll for this region
        var ownsDollInRegion = await _db.DollTokens
            .Where(t => t.UserId == travelerId)
            .Join(_db.Products, t => t.DollId, p => p.Id, (t, p) => p.Region)
            .AnyAsync(r => r == checkpoint.Region, ct);

        bool dollBonusEligible = ownsDollInRegion && !alreadyHasDollBonus;

        // ── 4. Guard: already fully rewarded ──
        if (!isFirstCheckin && alreadyHasDollBonus)
            return Error("You have already checked in at this location with full rewards.", "ALREADY_COMPLETED");
            
        if (!isFirstCheckin && !dollBonusEligible)
            return Error("You have already checked in here and do not have a new doll bonus.", "NO_XP_AVAILABLE");

        // ── 5. Calculate XP to award ─────────────────────────────────────────
        int xpToAward = isFirstCheckin ? BaseCheckinXp : 0;
        if (dollBonusEligible) xpToAward += DollBonusXp;

        // ── 6. Award XP ───────────────────────────────────────────────────────
        var xpSource = dollBonusEligible && !isFirstCheckin ? XpSource.Bonus : XpSource.Checkin;
        var xpResult = await _gamification.AwardXpAsync(travelerId, xpToAward, xpSource, ct);

        // ── 7. Unlock stamp ───────────────────────────────────────────────────
        await _gamification.UnlockDigitalStampAsync(travelerId, checkpoint.Id, dollBonusEligible, ct);

        // ── 8. Increment check-in count on first visit ────────────────────────
        if (isFirstCheckin)
        {
            var profile = await _db.UserGamificationProfiles
                .FirstOrDefaultAsync(p => p.UserId == travelerId, ct);
            profile?.IncrementCheckins();
        }

        // ── 9. Persist CheckinRecord ──────────────────────────────────────────
        var record = new CheckinRecord(
            userId: travelerId,
            checkpointId: checkpoint.Id,
            latitude: (double)latitude,
            longitude: (double)longitude,
            accuracy: accuracyMeters,
            xpAwarded: xpToAward,
            dollTokenId: null); // Doll ID tracking is now independent

        _db.CheckinRecords.Add(record);
        await _db.SaveChangesAsync(ct);

        // ── 10. Build result ──────────────────────────────────────────────────
        return new GamificationCheckinResult
        {
            Success = true,
            CheckpointId = checkpoint.Id,
            CheckpointName = checkpoint.Name,
            CheckpointRegion = checkpoint.Region,
            StoryAssetUrl = checkpoint.StoryAssetUrl,

            XpAwarded = xpToAward,
            TotalXp = xpResult.NewXp,
            CurrentLevel = xpResult.NewLevel,
            NextLevelXp = Domain.Entities.UserGamificationProfile.CalculateXpForLevel(xpResult.NewLevel + 1),
            LeveledUp = xpResult.NewLevel > xpResult.PreviousLevel,

            IsNewStamp = isFirstCheckin,
            HasDollBonus = dollBonusEligible,

            DollName = null,
            DollRegion = ownsDollInRegion ? checkpoint.Region : null
        };
    }

    public async Task<GamificationClaimDollResult> ClaimDollAsync(
        Guid travelerId,
        string dollToken,
        CancellationToken ct = default)
    {
        var tokenResult = await _tokenService.ValidateTokenAsync(dollToken, travelerId, ct);
        if (!tokenResult.IsValid)
        {
            return new GamificationClaimDollResult
            {
                Success = false,
                ErrorMessage = tokenResult.ErrorMessage ?? "Invalid token",
                ErrorCode = "INVALID_TOKEN"
            };
        }

        var dollRegion = await _tokenService.GetDollRegionPublicAsync(tokenResult.DollId ?? Guid.Empty, ct);
        if (dollRegion == null)
        {
            return new GamificationClaimDollResult
            {
                Success = false,
                ErrorMessage = "Could not resolve region for this doll.",
                ErrorCode = "REGION_NOT_FOUND"
            };
        }

        var stampsInRegion = await _db.UserStamps
            .Where(s => s.UserId == travelerId)
            .Join(_db.Checkpoints, s => s.CheckpointId, c => c.Id, (s, c) => new { Stamp = s, Region = c.Region })
            .Where(x => x.Region == dollRegion)
            .Select(x => x.Stamp)
            .ToListAsync(ct);

        bool retroactiveBonusAwarded = false;
        int xpAwarded = 0;
        
        var profile = await _db.UserGamificationProfiles.FirstOrDefaultAsync(p => p.UserId == travelerId, ct);
        int prevLevel = profile?.CurrentLevel ?? 0;

        if (stampsInRegion.Any())
        {
            var stampToReward = stampsInRegion.FirstOrDefault(s => !s.HasDollBonus);
            
            if (stampToReward != null)
            {
                xpAwarded = await _gamification.AwardDollBonusXpAsync(travelerId, stampToReward.CheckpointId, ct);
                retroactiveBonusAwarded = xpAwarded > 0;
            }
        }
        
        profile = await _db.UserGamificationProfiles.FirstOrDefaultAsync(p => p.UserId == travelerId, ct);

        return new GamificationClaimDollResult
        {
            Success = true,
            DollId = tokenResult.DollId,
            DollName = tokenResult.DollName,
            Region = dollRegion,
            RetroactiveBonusAwarded = retroactiveBonusAwarded,
            XpAwarded = xpAwarded,
            TotalXp = profile?.TotalXp ?? 0,
            CurrentLevel = profile?.CurrentLevel ?? 0,
            LeveledUp = profile?.CurrentLevel > prevLevel
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static GamificationCheckinResult Error(string message, string code) =>
        new() { Success = false, ErrorMessage = message, ErrorCode = code };
}
