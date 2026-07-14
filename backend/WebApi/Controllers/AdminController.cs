using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Domain.Common;
using WebApi.Middleware;
using Application.Interfaces.Persistence;
using Application.DTOs;
using Domain.Entities;
using Domain.Enums;
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
    private readonly IUnitOfWork _uow;
    private readonly IAuthenticationService _auth;
    private readonly ITokenService _tokenService;
    private readonly IProductRepository _products;

    public AdminController(
        IStorageService storage,
        ISecureRandomService random,
        ILogger<AdminController> logger,
        IUnitOfWork uow,
        IAuthenticationService auth,
        ITokenService tokenService,
        IProductRepository products)
    {
        _storage = storage;
        _random = random;
        _logger = logger;
        _uow = uow;
        _auth = auth;
        _tokenService = tokenService;
        _products = products;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] AdminLoginRequest req, CancellationToken ct)
    {
        var admin = await _uow.AdminUsers.Query().FirstOrDefaultAsync(x => x.Username == req.Username, ct);
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

    // ── Product CRUD (covers all product types: Doll, PassportCover, etc.) ──────
    [HttpGet("products")]
    public async Task<IActionResult> GetProducts(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _uow.Products.Query().Where(x => !x.IsDeleted);

        if (!string.IsNullOrEmpty(search))
        {
            var s = search.ToLower();
            query = query.Where(x => x.Name.ToLower().Contains(s) || x.Region.ToLower().Contains(s));
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(x => x.IsHighlight)
            .ThenByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => new
            {
                p.Id, p.Name, p.Region, p.Description, p.Material, p.Price,
                p.ImageUrl, p.IsHighlight, p.IsDeleted, p.Sku,
                ProductType = p.ProductType.ToString(),
                p.CreatedAt
            })
            .ToListAsync(ct);

        return Ok(new { data = items, total, page, pageSize });
    }

    /// <summary>GET /api/v1/admin/products/doll-options — list Doll products for Character linking dropdown.</summary>
    [HttpGet("products/doll-options")]
    public async Task<IActionResult> GetDollOptions(CancellationToken ct)
    {
        var dolls = await _uow.Products.Query()
            .AsNoTracking()
            .Where(p => p.ProductType == ProductType.Doll && !p.IsDeleted)
            .OrderBy(p => p.Region).ThenBy(p => p.Name)
            .Select(p => new { p.Id, p.Name, p.Sku, p.Region })
            .ToListAsync(ct);

        return Ok(new { dolls });
    }

    [HttpPost("products")]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductRequest req, CancellationToken ct)
    {
        if (!Enum.TryParse<ProductType>(req.ProductType, true, out var productType))
            return BadRequest(new { message = $"Invalid productType: '{req.ProductType}'. Valid values: {string.Join(", ", Enum.GetNames<ProductType>())}" });

        var product = Product.Create(
            req.Name, req.Region, productType,
            sku: req.Sku,
            imageUrl: req.ImageUrl,
            description: req.Description,
            material: req.Material,
            price: req.Price,
            isHighlight: req.IsHighlight);

        _uow.Products.Add(product);
        await _uow.SaveChangesAsync(ct);

        return Ok(new { product.Id, product.Name, product.Region, ProductType = product.ProductType.ToString(), product.Sku, product.ImageUrl, product.Description, product.Material, product.Price, product.IsHighlight, product.CreatedAt });
    }

    [HttpPut("products/{id}")]
    public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductRequest req, CancellationToken ct)
    {
        var product = await _uow.Products.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product == null) return NotFound();

        product.Update(
            name: req.Name,
            region: req.Region,
            sku: req.Sku,
            description: req.Description,
            material: req.Material,
            price: req.Price,
            imageUrl: req.ImageUrl,
            isHighlight: req.IsHighlight);

        await _uow.SaveChangesAsync(ct);
        return Ok(new { product.Id, product.Name, product.Region, ProductType = product.ProductType.ToString(), product.Sku, product.ImageUrl, product.Description, product.Material, product.Price, product.IsHighlight });
    }

    [HttpDelete("products/{id}")]
    public async Task<IActionResult> DeleteProduct(Guid id, CancellationToken ct)
    {
        var product = await _uow.Products.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (product == null) return NotFound();

        product.MarkAsDeleted();
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Character CRUD ───────────────────────────────────────────
    [HttpGet("characters")]
    public async Task<IActionResult> GetCharacters(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _uow.Characters.Query().Where(x => !x.IsDeleted);

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
        var character = Character.Create(req.Name, req.Region, req.ModelUrl, "{}", req.Description, req.ProductId);
        _uow.Characters.Add(character);
        await _uow.SaveChangesAsync(ct);
        return Ok(character);
    }

    [HttpPut("characters/{id}")]
    public async Task<IActionResult> UpdateCharacter(Guid id, [FromBody] UpdateCharacterRequest req, CancellationToken ct)
    {
        var character = await _uow.Characters.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (character == null) return NotFound();

        character.Update(req.Name, req.Region, req.ModelUrl, req.Description);
        await _uow.SaveChangesAsync(ct);
        return Ok(character);
    }

    [HttpDelete("characters/{id}")]
    public async Task<IActionResult> DeleteCharacter(Guid id, CancellationToken ct)
    {
        var character = await _uow.Characters.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (character == null) return NotFound();
        
        character.SoftDelete();
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Doll (Product) + Token management ─────────────────────────────────────────
    // The "QR" string the user actually scans is the DollToken.Token (see TokenService).
    // Admins use these endpoints to create a Doll MODEL and then mint any number of
    // single-use QR tokens for that model. Each physical unit sold carries one token.

    /// <summary>GET /api/v1/admin/dolls — list all Doll models with token stats.</summary>
    [HttpGet("dolls")]
    public async Task<IActionResult> GetDolls(CancellationToken ct)
    {
        var dolls = await _uow.Products.Query()
            .AsNoTracking()
            .Where(p => p.ProductType == ProductType.Doll && !p.IsDeleted && _uow.Characters.Query().Any(c => c.ProductId == p.Id && !c.IsDeleted))
            .OrderBy(p => p.Region).ThenBy(p => p.Name)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Sku,
                p.Region,
                p.ImageUrl,
                p.CreatedAt,
                ModelUrl = _uow.Characters.Query()
                    .Where(c => c.ProductId == p.Id && !c.IsDeleted)
                    .Select(c => c.ModelUrl)
                    .FirstOrDefault(),
                Character = _uow.Characters.Query()
                    .Where(c => c.ProductId == p.Id && !c.IsDeleted)
                    .Select(c => new { c.Id, c.Name, c.ModelUrl })
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        // Count tokens per doll
        var dollIds = dolls.Select(d => d.Id).ToList();
        var tokenStats = await _uow.DollTokens.Query()
            .AsNoTracking()
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
            d.Id, d.Name, d.Sku, d.Region, d.ImageUrl, d.CreatedAt,
            modelUrl = d.ModelUrl,
            character = d.Character,
            tokens = tokenStats.GetValueOrDefault(d.Id)
        }).ToList();

        return Ok(new { dolls = result, total = result.Count });
    }

    /// <summary>
    /// POST /api/v1/admin/dolls — upsert a Doll model by <c>region</c>.
    /// <para>
    /// If a Doll with the same region (case-insensitive, trimmed) already exists, the
    /// existing one is returned with <c>reused=true</c> and no duplicate row is
    /// inserted. This matches the requirement: "khi tạo mới model trong admin thì sẽ
    /// lấy theo product có type=doll có sẵn".
    /// </para>
    /// </summary>
    [HttpPost("dolls")]
    public async Task<IActionResult> CreateDoll([FromBody] CreateDollRequest req, CancellationToken ct)
    {
        if (req == null || string.IsNullOrWhiteSpace(req.Region))
            return BadRequest(new { success = false, message = "Region is required." });

        var region = req.Region.Trim();

        // Upsert: prefer the existing Doll for this region so we never duplicate.
        var existing = await _products.GetDollByRegionAsync(region, ct);
        if (existing != null)
        {
            // Optionally patch sku / image on the existing row when caller provided them.
            bool dirty = false;
            if (!string.IsNullOrWhiteSpace(req.Sku) && req.Sku != existing.Sku)
            {
                existing.Update(sku: req.Sku, region: null);
                dirty = true;
            }
            if (!string.IsNullOrWhiteSpace(req.ImageUrl) && req.ImageUrl != existing.ImageUrl)
            {
                // SOLID fix: use the domain's own UpdateImageUrl method instead of reflection.
                // Reflection bypasses all invariants, is brittle, slow, and unsafe.
                existing.UpdateImageUrl(req.ImageUrl);
                dirty = true;
            }
            if (dirty) await _products.UpdateAsync(existing, ct);

            _logger.LogInformation(
                "Admin reused Doll {Id} for region {Region} (sku={Sku})",
                existing.Id, existing.Region, existing.Sku);

            return Ok(new
            {
                success = true,
                reused = true,
                doll = new
                {
                    existing.Id, existing.Sku, existing.Region,
                    existing.ImageUrl, existing.CreatedAt
                }
            });
        }

        var doll = Product.Create(req.Sku ?? region, region, ProductType.Doll, sku: req.Sku, imageUrl: req.ImageUrl);
        _uow.Products.Add(doll);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Admin created Doll {Id} (region={Region}, sku={Sku})",
            doll.Id, doll.Region, doll.Sku);

        return Ok(new
        {
            success = true,
            reused = false,
            doll = new
            {
                doll.Id, doll.Sku, doll.Region, doll.ImageUrl, doll.CreatedAt
            }
        });
    }

    /// <summary>GET /api/v1/admin/dolls/{dollId}/tokens — list tokens for a doll.</summary>
    [HttpGet("dolls/{dollId}/tokens")]
    public async Task<IActionResult> GetDollTokens(Guid dollId, CancellationToken ct)
    {
        var doll = await _uow.Products.Query().FirstOrDefaultAsync(x => x.Id == dollId, ct); if (doll == null || doll.ProductType != Domain.Enums.ProductType.Doll)
            return NotFound(new { message = "Model 3D not found." });

        var tokens = await _uow.DollTokens.Query()
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

        var doll = await _uow.Products.Query().FirstOrDefaultAsync(x => x.Id == dollId, ct); if (doll == null || doll.ProductType != Domain.Enums.ProductType.Doll)
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
        var token = await _uow.DollTokens.Query().FirstOrDefaultAsync(
            t => t.Id == tokenId && t.DollId == dollId, ct);
        if (token == null) return NotFound(new { message = "Token not found." });
        if (token.IsUsed) return Conflict(new { message = "Token is already used." });

        token.MarkAsUsed();
        await _uow.SaveChangesAsync(ct);

        _logger.LogWarning("Admin revoked token {TokenId} for doll {DollId}", tokenId, dollId);
        return Ok(new { success = true, message = "Token revoked." });
    }

    // ── Account CRUD ───────────────────────────────────────────
    [HttpGet("accounts")]
    public async Task<IActionResult> GetAccounts(
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, CancellationToken ct = default)
    {
        var query = _uow.PassportAccounts.Query();

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
        var account = await _uow.PassportAccounts.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (account == null) return NotFound();
        
        if (account.IsLocked)
            account.Unlock();
        else
            account.Lock();
            
        await _uow.SaveChangesAsync(ct);
        return Ok(account);
    }

    [HttpDelete("accounts/{id}")]
    public async Task<IActionResult> DeleteAccount(Guid id, CancellationToken ct)
    {
        var account = await _uow.PassportAccounts.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (account == null) return NotFound();
        
        account.Lock(); // Soft delete for accounts is Lock
        await _uow.SaveChangesAsync(ct);
        return NoContent();
    }

    // ── Checkpoint management ─────────────────────────────────────────────────

    /// <summary>GET /api/v1/admin/checkpoints — list all checkpoints.</summary>
    [HttpGet("checkpoints")]
    public async Task<IActionResult> GetCheckpoints(CancellationToken ct)
    {
        var checkpoints = await _uow.Checkpoints.Query()
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

        _uow.Checkpoints.Add(checkpoint);
        await _uow.SaveChangesAsync(ct);

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
        var checkpoint = await _uow.Checkpoints.Query().FirstOrDefaultAsync(x => x.Id == id, ct);
        if (checkpoint == null) return NotFound();

        checkpoint.Update(req.Name, req.Region, req.StoryAssetUrl, req.IsActive);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Admin patched checkpoint {Id}", id);
        return Ok(new
        {
            checkpoint.Id, checkpoint.Name, checkpoint.Region,
            checkpoint.StoryAssetUrl, checkpoint.IsActive
        });
    }
}

// ── DTOs ──────────────────────────────────────────────────────────────────────



