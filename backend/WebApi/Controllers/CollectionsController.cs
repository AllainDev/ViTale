using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Infrastructure.Persistence;
using WebApi.Middleware;

namespace WebApi.Controllers;

public class CollectionsController : ControllerBase
{
    private readonly ApplicationDbContext _db;

    public CollectionsController(ApplicationDbContext db)
    {
        _db = db;
    }

    [HttpGet("api/v1/collections")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var items = await _db.CollectionItems.ToListAsync(ct);
        return Ok(items);
    }
}
