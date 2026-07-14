using Application.DTOs;
using Application.Interfaces.Services;
using Application.Interfaces.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using WebApi.Middleware;

namespace WebApi.Controllers;

/// <summary>
/// Exposes gamification endpoints: GPS check-in and user status.
/// GET  /api/v1/gamification/status
/// POST /api/v1/gamification/checkin
/// GET  /api/v1/gamification/checkpoints/nearby
/// </summary>
public class GamificationController : BaseController
{
    private readonly ICheckinService _checkinService;
    private readonly IGamificationService _gamificationService;
    private readonly Application.Interfaces.Services.IGeolocationService _geo;
    private readonly ITokenService _tokenService;
    private readonly IUnitOfWork _uow;

    public GamificationController(
        ICheckinService checkinService,
        IGamificationService gamificationService,
        Application.Interfaces.Services.IGeolocationService geo,
        ITokenService tokenService,
        IUnitOfWork uow)
    {
        _checkinService = checkinService;
        _gamificationService = gamificationService;
        _geo = geo;
        _tokenService = tokenService;
        _uow = uow;
    }

    // ── POST /api/v1/gamification/checkin ─────────────────────────────────────

    /// <summary>
    /// Processes a GPS-based gamification check-in.
    /// Accepts optional doll token (from QR scan) for bonus XP.
    /// </summary>
    [HttpPost("gamification/checkin")]
    public async Task<IActionResult> Checkin(
        [FromBody] GamificationCheckinRequest request,
        CancellationToken ct)
    {
        if (!ModelState.IsValid)
            throw new ValidationException("Invalid request body.");

        // OWASP A09: do NOT log GPS coordinates to console — privacy violation.
        // (Request-level structured logging is done by Serilog request middleware.)

        var travelerId = (await GetCurrentTravelerAsync()).Id;

        // OWASP A09: ExceptionHandlingMiddleware handles all unhandled exceptions.
        // Domain exceptions (ValidationException, etc.) flow through it and never
        // expose internal details. Do NOT catch Exception here to leak ex.Message.
        var result = await _checkinService.ProcessGamificationCheckinAsync(
            travelerId,
            request.Latitude,
            request.Longitude,
            request.AccuracyMeters,
            request.CheckpointId,
            ct);

        if (!result.Success)
        {
            var statusCode = result.ErrorCode switch
            {
                "INVALID_COORDS" => 400,
                "INVALID_TOKEN"  => 400,
                "OUT_OF_RANGE"   => 404,
                "ALREADY_COMPLETED"    => 409,
                "BONUS_ALREADY_AWARDED" => 409,
                "NO_XP_AVAILABLE"      => 409,
                _ => 500
            };

            return StatusCode(statusCode, new
            {
                success = false,
                errorCode = result.ErrorCode,
                errorMessage = result.ErrorMessage
            });
        }

        return Ok(new CheckinResponse
        {
            Success = true,
            CheckpointId = result.CheckpointId,
            CheckpointName = result.CheckpointName,
            CheckpointRegion = result.CheckpointRegion,
            StoryAssetUrl = result.StoryAssetUrl,
            XpAwarded = result.XpAwarded,
            TotalXp = result.TotalXp,
            CurrentLevel = result.CurrentLevel,
            NextLevelXp = result.NextLevelXp,
            LeveledUp = result.LeveledUp,
            IsNewStamp = result.IsNewStamp,
            HasDollBonus = result.HasDollBonus,
            DollName = result.DollName,
            DollRegion = result.DollRegion
        });
    }

    // ── POST /api/v1/gamification/claim-doll ──────────────────────────────────
    /// <summary>
    /// Claims a doll by scanning its QR code (a DollToken.Token).
    /// The QR is validated via TokenService (HMAC signature + DB checks).
    /// On success, the doll is bound to the current traveler.
    /// </summary>
    [HttpPost("gamification/claim-doll")]
    public async Task<IActionResult> ClaimDoll(
        [FromBody] GamificationClaimDollRequest request,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DollToken))
            return BadRequest(new { success = false, errorCode = "INVALID_TOKEN", errorMessage = "Mã QR không hợp lệ." });

        var travelerId = (await GetCurrentTravelerAsync()).Id;

        // ── 1. Validate via TokenService (HMAC + format + region/type) ──
        var tokenResult = await _tokenService.ValidateTokenAsync(request.DollToken, travelerId, ct);
        if (!tokenResult.IsValid)
        {
            return BadRequest(new
            {
                success = false,
                errorCode = "INVALID_TOKEN",
                errorMessage = tokenResult.ErrorMessage ?? "Mã QR không hợp lệ."
            });
        }

        // ── 2. Atomic claim + mark-used in a transaction ──────────────────
        var result = await _uow.ExecuteInTransactionAsync<IActionResult>(async () => {
            try
            {
                var tokenEntity = await _uow.DollTokens.Query()
                    .FirstOrDefaultAsync(t => t.Token == request.DollToken, ct);

                if (tokenEntity == null)
                {
                    return BadRequest(new { success = false, errorCode = "INVALID_TOKEN", errorMessage = "Mã QR không hợp lệ hoặc không tồn tại." });
                }

                if (tokenEntity.IsUsed)
                {
                    return Conflict(new { success = false, errorCode = "TOKEN_USED", errorMessage = "Mã QR này đã được sử dụng." });
                }

                // Bind to user (if not yet) and mark as used in one shot
                if (!tokenEntity.UserId.HasValue)
                    tokenEntity.Claim(travelerId);
                tokenEntity.MarkAsUsed();

                try
                {
                    await _uow.SaveChangesAsync(ct);
                }
                catch (DbUpdateConcurrencyException)
                {
                    return Conflict(new { success = false, errorCode = "TOKEN_RACE", errorMessage = "Mã QR đang được xử lý đồng thời. Vui lòng thử lại." });
                }

                // ── 3. Retroactive bonus if the user already has a stamp in that region ──
                bool retroactiveBonusAwarded = false;
                int xpAwarded = 0;
                int prevLevel = 0;
                int newLevel = 0;
                int totalXp = 0;

                var dollRegion = await _tokenService.GetDollRegionPublicAsync(tokenEntity.DollId, ct);
                if (!string.IsNullOrEmpty(dollRegion))
                {
                    var profile = await _uow.UserGamificationProfiles.Query()
                        .FirstOrDefaultAsync(p => p.UserId == travelerId, ct);
                    prevLevel = profile?.CurrentLevel ?? 0;

                    var stampToReward = await _uow.UserStamps.Query()
                        .Where(s => s.UserId == travelerId)
                        .Join(_uow.Checkpoints.Query(), s => s.CheckpointId, c => c.Id, (s, c) => new { Stamp = s, c.Region })
                        .Where(x => x.Region == dollRegion && !x.Stamp.HasDollBonus)
                        .Select(x => x.Stamp)
                        .FirstOrDefaultAsync(ct);

                    if (stampToReward != null)
                    {
                        xpAwarded = await _gamificationService.AwardDollBonusXpAsync(travelerId, stampToReward.CheckpointId, ct);
                        retroactiveBonusAwarded = xpAwarded > 0;
                    }

                    profile = await _uow.UserGamificationProfiles.Query()
                        .FirstOrDefaultAsync(p => p.UserId == travelerId, ct);
                    totalXp = profile?.TotalXp ?? 0;
                    newLevel = profile?.CurrentLevel ?? 0;
                }

                

                return Ok(new
                {
                    success = true,
                    dollId = tokenEntity.DollId.ToString(),
                    dollName = tokenResult.DollName,
                    region = dollRegion,
                    retroactiveBonusAwarded,
                    xpAwarded,
                    totalXp,
                    currentLevel = newLevel,
                    leveledUp = newLevel > prevLevel
                });
            }
            catch
            {
                
                throw;
            }
        });

        return result;
    }

    // ── POST /api/v1/gamification/create-test-checkpoint ─────────────────────────
    
    [AllowAnonymous]
    [HttpPost("gamification/create-test-checkpoint")]
    public async Task<IActionResult> CreateTestCheckpoint(CancellationToken ct)
    {
        var env = HttpContext.RequestServices.GetRequiredService<IHostEnvironment>();
        if (!env.IsDevelopment()) return NotFound("Only available in development environment.");

        // 500m gives the "Nhà của bạn" checkpoint a generous GPS tolerance so the user can
        // check-in from anywhere within a typical residential block. Combined with the
        // per-checkpoint effectiveRadius logic in CheckinService, the actual check-in
        // radius becomes 500m + GPS-accuracy-buffer.
        // If a "Nhà của bạn" checkpoint already exists from a previous run, update its
        // radius instead of creating duplicates.
        const int homeRadius = 500;
        const decimal homeLat = 21.022320622035508m;
        const decimal homeLng = 105.52057995771676m;
        const string homeName = "Nhà của bạn";

        var existing = await _uow.Checkpoints.Query()
            .FirstOrDefaultAsync(c => c.Name == homeName, ct);

        if (existing != null)
        {
            existing.UpdateRadius(homeRadius);
            await _uow.SaveChangesAsync(ct);
            return Ok(new { success = true, checkpointId = existing.Id, updated = true });
        }

        var cp = Domain.Entities.Checkpoint.Create(
            homeName, homeLat, homeLng, homeRadius, "Hà Nội", null, null);
        _uow.Checkpoints.Add(cp);
        await _uow.SaveChangesAsync(ct);
        return Ok(new { success = true, checkpointId = cp.Id, created = true });
    }

    // ── GET /api/v1/gamification/status ──────────────────────────────────────

    /// <summary>
    /// Returns the current traveler's full gamification profile.
    /// </summary>
    [HttpGet("gamification/status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var travelerId = (await GetCurrentTravelerAsync()).Id;
        var status = await _gamificationService.GetUserGamificationStatusAsync(travelerId, ct);

        // Hydrate HasDollBonus per stamp from the database
        var checkpointIds = status.Stamps.Select(s => s.CheckpointId).ToList();
        var stampBonusMap = await _uow.UserStamps.Query()
            .AsNoTracking()
            .Where(s => s.UserId == travelerId && checkpointIds.Contains(s.CheckpointId))
            .Select(s => new { s.CheckpointId, s.HasDollBonus })
            .ToDictionaryAsync(s => s.CheckpointId, s => s.HasDollBonus, ct);

        var stampDetails = status.Stamps.Select(s => new StampDetail
        {
            CheckpointId = s.CheckpointId,
            CheckpointName = s.CheckpointName,
            UnlockedAt = s.UnlockedAt,
            HasDollBonus = stampBonusMap.GetValueOrDefault(s.CheckpointId)
        }).ToList();

        // Hydrate owned dolls.
        // ImageUrl: prefer the physical token's image (if any) — otherwise fall
        // back to the parent Doll Product's image. This is the only place the
        // client sees the doll's photo, so we resolve it server-side to keep
        // the public payload clean.
        var ownedDolls = await _uow.DollTokens.Query()
            .AsNoTracking()
            .Where(t => t.UserId == travelerId && t.ClaimedAt != null)
            .Join(
                _uow.Products.Query(),
                t => t.DollId,
                p => p.Id,
                (t, p) => new DollDetail
                {
                    Id = p.Id,
                    Region = p.Region,
                    ImageUrl = !string.IsNullOrEmpty(p.ImageUrl) ? p.ImageUrl : null,
                    ClaimedAt = t.ClaimedAt!.Value
                }
            )
            .OrderByDescending(d => d.ClaimedAt)
            .ToListAsync(ct);

        return Ok(new GamificationStatusResponse
        {
            TotalXp = status.TotalXp,
            CurrentLevel = status.CurrentLevel,
            CheckinsCount = status.CheckinsCount,
            StampsUnlocked = status.StampsUnlocked,
            BadgesEarned = status.BadgesEarned,
            NextLevelXp = status.NextLevelXp,
            Stamps = stampDetails,
            OwnedDolls = ownedDolls
        });
    }

    // ── GET /api/v1/gamification/checkpoints ─────────────────────────────────────

    /// <summary>
    /// Returns all active checkpoints, marking which ones the user has visited.
    /// </summary>
    [HttpGet("gamification/all-checkpoints")]
    public async Task<IActionResult> GetAllCheckpoints(CancellationToken ct)
    {
        var travelerId = (await GetCurrentTravelerAsync()).Id;

        var checkpoints = await _uow.Checkpoints.Query()
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(ct);

        var visitedIds = await _uow.UserStamps.Query()
            .AsNoTracking()
            .Where(s => s.UserId == travelerId)
            .Select(s => new { s.CheckpointId, s.HasDollBonus })
            .ToDictionaryAsync(s => s.CheckpointId, s => s.HasDollBonus, ct);

        // ── Compute the set of regions the user owns a Doll for ──
        // Join DollTokens (claimed by user) → Products (Doll only) → region.
        var regionsOwnedByDoll = await _uow.DollTokens.Query()
            .AsNoTracking()
            .Where(t => t.UserId == travelerId)
            .Join(
                _uow.Products.Query().Where(p => p.ProductType == Domain.Enums.ProductType.Doll),
                t => t.DollId,
                p => p.Id,
                (t, p) => p.Region)
            .Distinct()
            .ToListAsync(ct);

        var result = checkpoints.Select(c => new NearbyGamificationCheckpointDto
        {
            Id = c.Id,
            Name = c.Name,
            Region = c.Region,
            Latitude = c.Latitude,
            Longitude = c.Longitude,
            DistanceMeters = 0, // Not applicable
            StoryAssetUrl = c.StoryAssetUrl,
            IsVisited = visitedIds.ContainsKey(c.Id),
            HasDollBonus = visitedIds.GetValueOrDefault(c.Id),
            RegionDollOwned = regionsOwnedByDoll.Contains(c.Region)
        }).ToList();

        return Ok(new { checkpoints = result, count = result.Count });
    }

    // ── GET /api/v1/gamification/checkpoints/nearby ───────────────────────────

    /// <summary>
    /// Returns active checkpoints within 100 metres of the provided GPS coordinates.
    /// </summary>
    [HttpGet("gamification/checkpoints/nearby")]
    public async Task<IActionResult> GetNearbyCheckpoints(
        [FromQuery] decimal lat,
        [FromQuery] decimal lng,
        CancellationToken ct)
    {
        if (lat < -90 || lat > 90)
            throw new ValidationException("Invalid latitude.");
        if (lng < -180 || lng > 180)
            throw new ValidationException("Invalid longitude.");

        const int gamificationRadius = 100; // metres

        var travelerId = (await GetCurrentTravelerAsync()).Id;

        var checkpoints = await _uow.Checkpoints.Query()
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(ct);

        // Get stamps already collected by this user
        var visitedIds = await _uow.UserStamps.Query()
            .AsNoTracking()
            .Where(s => s.UserId == travelerId)
            .Select(s => new { s.CheckpointId, s.HasDollBonus })
            .ToDictionaryAsync(s => s.CheckpointId, s => s.HasDollBonus, ct);

        var nearby = checkpoints
            .Select(c => new
            {
                Checkpoint = c,
                DistanceMeters = _geo.CalculateDistanceMeters(lat, lng, c.Latitude, c.Longitude)
            })
            .Where(x => x.DistanceMeters <= gamificationRadius)
            .OrderBy(x => x.DistanceMeters)
            .Select(x => new NearbyGamificationCheckpointDto
            {
                Id = x.Checkpoint.Id,
                Name = x.Checkpoint.Name,
                Region = x.Checkpoint.Region,
                Latitude = x.Checkpoint.Latitude,
                Longitude = x.Checkpoint.Longitude,
                DistanceMeters = x.DistanceMeters,
                StoryAssetUrl = x.Checkpoint.StoryAssetUrl,
                IsVisited = visitedIds.ContainsKey(x.Checkpoint.Id),
                HasDollBonus = visitedIds.GetValueOrDefault(x.Checkpoint.Id)
            })
            .ToList();

        return Ok(new { checkpoints = nearby, count = nearby.Count });
    }
}




