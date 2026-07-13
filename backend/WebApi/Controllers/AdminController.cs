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
    private readonly ITokenService _tokenService;

    public AdminController(
        IStorageService storage,
        ISecureRandomService random,
        ILogger<AdminController> logger,
        ApplicationDbContext db,
        IAuthenticationService auth,
        ITokenService tokenService)
    {
        _storage = storage;
        _random = random;
        _logger = logger;
        _db = db;
        _auth = auth;
        _tokenService = tokenService;
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

    /// <summary>GET /api/v1/admin/upload-presigned-url</summary>
    [HttpGet("upload-presigned-url")]
    public IActionResult GetUploadPresignedUrl([FromQuery] string fileName, [FromQuery] string contentType)
    {
        if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(contentType))
        {
            return BadRequest(new { message = "fileName and contentType are required." });
        }

        var hash = _random.GenerateFileHash(fileName + DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        
        string folder = contentType.StartsWith("image/") ? "images" : "models";
        var key = $"{folder}/{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{hash[..8]}{ext}";

        var presignedUrl = _storage.GeneratePreSignedUrl(key, contentType, TimeSpan.FromMinutes(15));
        var publicUrl = _storage.GetPublicUrl(key);

        return Ok(new { presignedUrl, publicUrl, key });
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

    // ── Doll (Product) + Token management ─────────────────────────────────────────
    // The "QR" string the user actually scans is the DollToken.Token (see TokenService).
    // Admins use these endpoints to create a Doll MODEL and then mint any number of
    // single-use QR tokens for that model. Each physical unit sold carries one token.

    /// <summary>GET /api/v1/admin/dolls — list all Doll models.</summary>
    [HttpGet("dolls")]
    public async Task<IActionResult> GetDolls(CancellationToken ct)
    {
        var dolls = await _db.Products.AsNoTracking().Where(p => p.ProductType == Domain.Enums.ProductType.Doll)
            .OrderBy(p => p.Region).ThenBy(p => p.Id)
            .Select(p => new
            {
                p.Id,
                Sku = p.Sku,
                p.Region,
                ModelUrl = _db.Characters.Where(c => c.Region == p.Region && !c.IsDeleted).Select(c => c.ModelUrl).FirstOrDefault(),
                CreatedAt = DateTime.UtcNow // fallback
            })
            .ToListAsync(ct);

        // Count tokens per doll
        var dollIds = dolls.Select(d => d.Id).ToList();
        var tokenStats = await _db.DollTokens
            .Where(t => dollIds.Contains(t.DollId))
            .GroupBy(t => t.DollId)
            .Select(g => new
            {
                DollId = g.Key,
                Total = g.Count(),
                Unused = g.Count(t => !t.IsUsed),
                Used = g.Count(t => t.IsUsed)
            })
            .ToDictionaryAsync(x => x.DollId, ct);

        var result = dolls.Select(d => new
        {
            d.Id, d.Sku, d.Region, d.ModelUrl, d.CreatedAt,
            tokens = tokenStats.GetValueOrDefault(d.Id)
        }).ToList();

        return Ok(new { dolls = result, total = result.Count });
    }

    /// <summary>POST /api/v1/admin/dolls — create a new Doll model.</summary>
    [HttpPost("dolls")]
    public async Task<IActionResult> CreateDoll([FromBody] CreateDollRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Region))
            return BadRequest(new { success = false, message = "Region is required." });

        var doll = Domain.Entities.Product.Create(req.Sku, Domain.Enums.ProductType.Doll, req.Region);
        _db.Products.Add(doll);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created Doll {Id} (region={Region}, sku={Sku})",
            doll.Id, doll.Region, doll.Sku);
        return Ok(new
        {
            success = true,
            doll = new { doll.Id, doll.Sku, doll.Region, doll.CreatedAt }
        });
    }

    /// <summary>GET /api/v1/admin/dolls/{dollId}/tokens — list tokens for a doll.</summary>
    [HttpGet("dolls/{dollId}/tokens")]
    public async Task<IActionResult> GetDollTokens(Guid dollId, CancellationToken ct)
    {
        var doll = await _db.Products.FindAsync([dollId], ct); if (doll == null || doll.ProductType != Domain.Enums.ProductType.Doll)
            return NotFound(new { message = "Model 3D not found." });

        var tokens = await _db.DollTokens
            .AsNoTracking()
            .Where(t => t.DollId == dollId)
            .OrderByDescending(t => t.GeneratedAt)
            .Select(t => new
            {
                t.Id,
                t.Token,
                t.GeneratedAt,
                t.ExpiresAt,
                t.IsUsed,
                t.UsedAt,
                t.UserId,
                t.ClaimedAt,
                status = t.IsUsed ? "used" : (t.ExpiresAt <= DateTime.UtcNow ? "expired" : "available")
            })
            .ToListAsync(ct);

        return Ok(new
        {
            doll = new { doll.Id, Sku = doll.Sku, doll.Region },
            tokens,
            total = tokens.Count
        });
    }

    /// <summary>
    /// POST /api/v1/admin/dolls/{dollId}/tokens — generate <c>count</c> new single-use tokens.
    /// Returns the raw token strings so the admin can print them as QRs.
    /// </summary>
    [HttpPost("dolls/{dollId}/tokens")]
    public async Task<IActionResult> GenerateDollTokens(
        Guid dollId,
        [FromBody] GenerateDollTokensRequest? req,
        CancellationToken ct)
    {
        req ??= new GenerateDollTokensRequest();
        var count = Math.Clamp(req.Count ?? 1, 1, 1000);

        var doll = await _db.Products.FindAsync([dollId], ct); if (doll == null || doll.ProductType != Domain.Enums.ProductType.Doll)
            return NotFound(new { message = "Model 3D not found." });

        var generated = new List<object>(count);
        for (int i = 0; i < count; i++)
        {
            var result = await _tokenService.GenerateTokenForDollAsync(dollId, ct);
            generated.Add(new
            {
                result.Token,
                dollId,
                dollRegion = doll.Region,
                dollSku = doll.Sku,
                result.GeneratedAt,
                result.ExpiresAt
            });
        }

        _logger.LogInformation("Admin generated {Count} tokens for doll {DollId}", count, dollId);

        return Ok(new
        {
            success = true,
            dollId,
            dollRegion = doll.Region,
            count = generated.Count,
            tokens = generated
        });
    }

    /// <summary>
    /// DELETE /api/v1/admin/dolls/{dollId}/tokens/{tokenId} — revoke (mark-as-used)
    /// a single token. Use for misprinted QRs. This is irreversible.
    /// </summary>
    [HttpDelete("dolls/{dollId}/tokens/{tokenId}")]
    public async Task<IActionResult> RevokeDollToken(Guid dollId, Guid tokenId, CancellationToken ct)
    {
        var token = await _db.DollTokens.FirstOrDefaultAsync(
            t => t.Id == tokenId && t.DollId == dollId, ct);
        if (token == null) return NotFound(new { message = "Token not found." });
        if (token.IsUsed) return Conflict(new { message = "Token is already used." });

        token.MarkAsUsed();
        await _db.SaveChangesAsync(ct);

        _logger.LogWarning("Admin revoked token {TokenId} for doll {DollId}", tokenId, dollId);
        return Ok(new { success = true, message = "Token revoked." });
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

public class CreateDollRequest
{
    /// <summary>Internal SKU, e.g. "SKU-HANOI-001". Optional.</summary>
    public string? Sku { get; set; }

    /// <summary>Region the doll unlocks bonuses for, e.g. "Hà Nội". Required.</summary>
    public string Region { get; set; } = string.Empty;
}

public class GenerateDollTokensRequest
{
    /// <summary>How many tokens to generate (default 1, max 1000).</summary>
    public int? Count { get; set; }
}




