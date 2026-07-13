using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Infrastructure.Persistence;

namespace WebApi.Controllers;

[ApiController]
[Route("")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<HealthController> _logger;

    public HealthController(ApplicationDbContext db, ILogger<HealthController> logger)
    {
        _db = db;
        _logger = logger;
    }

    [HttpGet("health")]
    [HttpGet("api/v1/health")]
    public async Task<IActionResult> Health(CancellationToken ct)
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync("SELECT 1", ct);
            return Ok(new HealthResponse("healthy", DateTime.UtcNow, "connected", "1.0.0"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check database connectivity failed");
            return StatusCode(503, new HealthResponse("unhealthy", DateTime.UtcNow, "disconnected", "1.0.0"));
        }
    }
}

