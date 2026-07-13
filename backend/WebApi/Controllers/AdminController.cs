using Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Domain.Common;
using WebApi.Middleware;
using Infrastructure.Persistence;
using Application.DTOs;
using Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;

namespace WebApi.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[RequireAdminJwt]
public class AdminController : ControllerBase
{
    private readonly IStorageService _storage;
    private readonly ISecureRandomService _random;
    private readonly ILogger<AdminController> _logger;
    private readonly ApplicationDbContext _db;
    private readonly IAuthenticationService _auth;

    public AdminController(
        IStorageService storage,
        ISecureRandomService random,
        ILogger<AdminController> logger,
        ApplicationDbContext db,
        IAuthenticationService auth)
    {
        _storage = storage;
        _random = random;
        _logger = logger;
        _db = db;
        _auth = auth;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req, CancellationToken ct)
    {
        var admin = await _db.AdminUsers.FirstOrDefaultAsync(x => x.Username == req.Username, ct);
        if (admin == null || !BCrypt.Net.BCrypt.Verify(req.Password, admin.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid username or password" });
        }

        var token = _auth.GenerateAdminJwt(admin.Id, admin.Username);
        return Ok(new { token });
    }

    /// <summary>POST /api/v1/admin/upload-character-model</summary>
    [HttpPost("upload-character-model")]
    [RequestSizeLimit(10 * 1024 * 1024)] // 10MB limit
    public async Task<IActionResult> UploadCharacterModel(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided." });
        if (file.Length > 10 * 1024 * 1024) return BadRequest(new { message = "File exceeds 10MB limit." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var fileBytes = ms.ToArray();

        var validationResult = FileValidator.Validate3DModel(fileBytes, file.FileName);
        if (!validationResult.IsSuccess)
        {
            _logger.LogWarning("Blocked malicious/invalid 3D model upload: {Reason}", validationResult.Error);
            return BadRequest(new { message = validationResult.Error });
        }

        var hash = _random.GenerateFileHash(Convert.ToBase64String(fileBytes));
        var key = $"characters/model-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{hash[..8]}.glb";

        var url = await _storage.UploadAsync(fileBytes, key, validationResult.Value, ct);
        if (url == null) return StatusCode(500, new { message = "Failed to upload to storage." });

        return Ok(new { url });
    }

    /// <summary>POST /api/v1/admin/upload-product-image</summary>
    [HttpPost("upload-product-image")]
    [RequestSizeLimit(5 * 1024 * 1024)] // 5MB limit
    public async Task<IActionResult> UploadProductImage(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0) return BadRequest(new { message = "No file provided." });
        if (file.Length > 5 * 1024 * 1024) return BadRequest(new { message = "File exceeds 5MB limit." });

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms, ct);
        var fileBytes = ms.ToArray();

        var validationResult = FileValidator.ValidateImage(fileBytes, file.FileName);
        if (!validationResult.IsSuccess)
        {
            _logger.LogWarning("Blocked malicious/invalid image upload: {Reason}", validationResult.Error);
            return BadRequest(new { message = validationResult.Error });
        }

        var hash = _random.GenerateFileHash(Convert.ToBase64String(fileBytes));
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var key = $"products/image-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{hash[..8]}{ext}";

        var url = await _storage.UploadAsync(fileBytes, key, validationResult.Value, ct);
        if (url == null) return StatusCode(500, new { message = "Failed to upload to storage." });

        return Ok(new { url });
    }

    // ── CollectionItem CRUD ─────────────────────────────────────
    [HttpGet("collections")]
    public async Task<IActionResult> GetCollections(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _db.CollectionItems.Where(x => !x.IsDeleted);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(s) || x.Region.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.Id)
                               .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Ok(new { data = items, total, page, pageSize });
    }

    [HttpPost("collections")]
    public async Task<IActionResult> CreateCollectionItem([FromBody] CreateCollectionItemRequest req, CancellationToken ct)
    {
        var item = new CollectionItem
        {
            Id = Guid.NewGuid(),
            Name = req.Name,
            Region = req.Region,
            Description = req.Description,
            Material = req.Material,
            Price = req.Price,
            ImageUrl = req.ImageUrl,
            IsHighlight = req.IsHighlight,
            IsDeleted = false
        };
        _db.CollectionItems.Add(item);
        await _db.SaveChangesAsync(ct);
        return Ok(item);
    }

    [HttpPut("collections/{id}")]
    public async Task<IActionResult> UpdateCollectionItem(Guid id, [FromBody] UpdateCollectionItemRequest req, CancellationToken ct)
    {
        var item = await _db.CollectionItems.FindAsync([id], ct);
        if (item == null) return NotFound();

        item.Name = req.Name;
        item.Region = req.Region;
        item.Description = req.Description;
        item.Material = req.Material;
        item.Price = req.Price;
        item.ImageUrl = req.ImageUrl;
        item.IsHighlight = req.IsHighlight;

        await _db.SaveChangesAsync(ct);
        return Ok(item);
    }

    [HttpDelete("collections/{id}")]
    public async Task<IActionResult> DeleteCollectionItem(Guid id, CancellationToken ct)
    {
        var item = await _db.CollectionItems.FindAsync([id], ct);
        if (item == null) return NotFound();
        
        item.IsDeleted = true;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Character CRUD ───────────────────────────────────────────
    [HttpGet("characters")]
    public async Task<IActionResult> GetCharacters(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _db.Characters.Where(x => !x.IsDeleted);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(s) || x.Region.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.Id)
                               .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Ok(new { data = items, total, page, pageSize });
    }

    [HttpPost("characters")]
    public async Task<IActionResult> CreateCharacter([FromBody] CreateCharacterRequest req, CancellationToken ct)
    {
        var character = Character.Create(req.Name, req.Region, req.ModelUrl, System.Text.Json.JsonDocument.Parse("{}"), req.Description);
        _db.Characters.Add(character);
        await _db.SaveChangesAsync(ct);
        return Ok(character);
    }

    [HttpPut("characters/{id}")]
    public async Task<IActionResult> UpdateCharacter(Guid id, [FromBody] UpdateCharacterRequest req, CancellationToken ct)
    {
        var character = await _db.Characters.FindAsync([id], ct);
        if (character == null) return NotFound();

        character.Update(req.Name, req.Region, req.ModelUrl, req.Description);
        await _db.SaveChangesAsync(ct);
        return Ok(character);
    }

    [HttpDelete("characters/{id}")]
    public async Task<IActionResult> DeleteCharacter(Guid id, CancellationToken ct)
    {
        var character = await _db.Characters.FindAsync([id], ct);
        if (character == null) return NotFound();
        
        character.SoftDelete();
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Account CRUD ───────────────────────────────────────────
    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _db.PassportAccounts.AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(x => x.Email.ToLower().Contains(s) || x.OAuthProvider.ToString().ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query.OrderByDescending(x => x.CreatedAt)
                               .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);

        return Ok(new { data = items, total, page, pageSize });
    }

    [HttpPut("accounts/{id}/toggle-lock")]
    public async Task<IActionResult> ToggleAccountLock(Guid id, CancellationToken ct)
    {
        var account = await _db.PassportAccounts.FindAsync([id], ct);
        if (account == null) return NotFound();
        
        if (account.IsLocked)
            account.Unlock();
        else
            account.Lock();
            
        await _db.SaveChangesAsync(ct);
        return Ok(account);
    }

    [HttpDelete("accounts/{id}")]
    public async Task<IActionResult> DeleteAccount(Guid id, CancellationToken ct)
    {
        var account = await _db.PassportAccounts.FindAsync([id], ct);
        if (account == null) return NotFound();
        
        account.Lock(); // Soft delete for accounts is Lock
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Checkpoint management ─────────────────────────────────────────────────

    /// <summary>GET /api/v1/admin/checkpoints — list all checkpoints.</summary>
    [HttpGet("checkpoints")]
    public async Task<IActionResult> GetCheckpoints(CancellationToken ct)
    {
        var checkpoints = await _db.Checkpoints
            .AsNoTracking()
            .OrderBy(c => c.Region).ThenBy(c => c.Name)
            .Select(c => new
            {
                c.Id, c.Name, c.Region, c.Latitude, c.Longitude,
                c.Radius, c.IsActive, c.StoryAssetUrl, c.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new { checkpoints, total = checkpoints.Count });
    }

    /// <summary>POST /api/v1/admin/checkpoints — create a new checkpoint.</summary>
    [HttpPost("checkpoints")]
    public async Task<IActionResult> CreateCheckpoint(
        [FromBody] CreateCheckpointRequest req, CancellationToken ct)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var checkpoint = Checkpoint.Create(
            req.Name, req.Latitude, req.Longitude,
            req.Radius, req.Region,
            storyAssetUrl: req.StoryAssetUrl);

        _db.Checkpoints.Add(checkpoint);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created checkpoint {Id} ({Name}) in {Region}", checkpoint.Id, checkpoint.Name, checkpoint.Region);
        return CreatedAtAction(nameof(GetCheckpoints), new { id = checkpoint.Id }, new { checkpoint.Id });
    }

    /// <summary>
    /// PATCH /api/v1/admin/checkpoints/{id} — update StoryAssetUrl, Region, or toggle IsActive.
    /// </summary>
    [HttpPatch("checkpoints/{id}")]
    public async Task<IActionResult> PatchCheckpoint(
        Guid id, [FromBody] PatchCheckpointRequest req, CancellationToken ct)
    {
        var checkpoint = await _db.Checkpoints.FindAsync([id], ct);
        if (checkpoint == null) return NotFound();

        checkpoint.Update(req.Name, req.Region, req.StoryAssetUrl, req.IsActive);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Admin patched checkpoint {Id}", id);
        return Ok(new
        {
            checkpoint.Id, checkpoint.Name, checkpoint.Region,
            checkpoint.StoryAssetUrl, checkpoint.IsActive
        });
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────

public class CreateCheckpointRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public int Radius { get; set; } = 100;
    public string Region { get; set; } = string.Empty;
    public string? StoryAssetUrl { get; set; }
}

public class PatchCheckpointRequest
{
    public string? Name { get; set; }
    public string? Region { get; set; }
    public string? StoryAssetUrl { get; set; }
    public bool? IsActive { get; set; }
}

