using Application.DTOs;
using Application.Interfaces.Services;
using Infrastructure.Persistence;
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
    private readonly ApplicationDbContext _db;

    public GamificationController(
        ICheckinService checkinService,
        IGamificationService gamificationService,
        Application.Interfaces.Services.IGeolocationService geo,
        ApplicationDbContext db)
    {
        _checkinService = checkinService;
        _gamificationService = gamificationService;
        _geo = geo;
        _db = db;
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

        Console.WriteLine($"[USER_LOCATION] Lat: {request.Latitude}, Lng: {request.Longitude}");

        var travelerId = CurrentTraveler.Id;

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
    
    [HttpPost("gamification/claim-doll")]
    public async Task<IActionResult> ClaimDoll([FromBody] GamificationClaimDollRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.DollToken))
            return BadRequest(new { success = false, errorMessage = "Mã QR không hợp lệ." });

        var travelerId = CurrentTraveler.Id;
        var product = await _db.Products
            .FirstOrDefaultAsync(p => p.QRCode == request.DollToken, ct);

        if (product == null)
            return BadRequest(new { success = false, errorMessage = "Mã QR không hợp lệ hoặc không tồn tại." });

        if (product.IsActivated)
            return BadRequest(new { success = false, errorMessage = "Búp bê này đã được thu thập." });

        product.Activate(travelerId);
        await _db.SaveChangesAsync(ct);

        return Ok(new
        {
            success = true,
            dollId = product.Id.ToString(),
            dollName = $"Búp bê {product.Region}",
            region = product.Region,
            retroactiveBonusAwarded = false
        });
    }

    // ── POST /api/v1/gamification/create-test-checkpoint ─────────────────────────
    
    [AllowAnonymous]
    [HttpPost("gamification/create-test-checkpoint")]
    public async Task<IActionResult> CreateTestCheckpoint(CancellationToken ct)
    {
        var cp = Domain.Entities.Checkpoint.Create("Nhà của bạn", 21.022320622035508m, 105.52057995771676m, 100, "Hà Nội", null, null);
        _db.Checkpoints.Add(cp);
        await _db.SaveChangesAsync(ct);
        return Ok(new { success = true, checkpointId = cp.Id });
    }

    // ── GET /api/v1/gamification/status ──────────────────────────────────────

    /// <summary>
    /// Returns the current traveler's full gamification profile.
    /// </summary>
    [HttpGet("gamification/status")]
    public async Task<IActionResult> GetStatus(CancellationToken ct)
    {
        var travelerId = CurrentTraveler.Id;
        var status = await _gamificationService.GetUserGamificationStatusAsync(travelerId, ct);

        // Hydrate HasDollBonus per stamp from the database
        var checkpointIds = status.Stamps.Select(s => s.CheckpointId).ToList();
        var stampBonusMap = await _db.UserStamps
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

        return Ok(new GamificationStatusResponse
        {
            TotalXp = status.TotalXp,
            CurrentLevel = status.CurrentLevel,
            CheckinsCount = status.CheckinsCount,
            StampsUnlocked = status.StampsUnlocked,
            BadgesEarned = status.BadgesEarned,
            NextLevelXp = status.NextLevelXp,
            Stamps = stampDetails
        });
    }

    // ── GET /api/v1/gamification/checkpoints ─────────────────────────────────────

    /// <summary>
    /// Returns all active checkpoints, marking which ones the user has visited.
    /// </summary>
    [HttpGet("gamification/all-checkpoints")]
    public async Task<IActionResult> GetAllCheckpoints(CancellationToken ct)
    {
        var travelerId = CurrentTraveler.Id;

        var checkpoints = await _db.Checkpoints
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(ct);

        var visitedIds = await _db.UserStamps
            .AsNoTracking()
            .Where(s => s.UserId == travelerId)
            .Select(s => new { s.CheckpointId, s.HasDollBonus })
            .ToDictionaryAsync(s => s.CheckpointId, s => s.HasDollBonus, ct);

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
            HasDollBonus = visitedIds.GetValueOrDefault(c.Id)
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

        var travelerId = CurrentTraveler.Id;

        var checkpoints = await _db.Checkpoints
            .AsNoTracking()
            .Where(c => c.IsActive)
            .ToListAsync(ct);

        // Get stamps already collected by this user
        var visitedIds = await _db.UserStamps
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

// ── Request / Response DTOs local to this controller ──────────────────────────

public class GamificationCheckinRequest
{
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public double? AccuracyMeters { get; set; }
    public Guid? CheckpointId { get; set; }
}

public class GamificationClaimDollRequest
{
    public string DollToken { get; set; } = string.Empty;
}

public class NearbyGamificationCheckpointDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public double DistanceMeters { get; set; }
    public string? StoryAssetUrl { get; set; }
    public bool IsVisited { get; set; }
    public bool HasDollBonus { get; set; }
}

