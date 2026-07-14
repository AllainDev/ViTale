using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Infrastructure.Persistence;
using Domain.Enums;

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
        var items = await _db.Products
            .Where(p => !p.IsDeleted)
            .OrderByDescending(p => p.IsHighlight)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        var mapped = items.Select(p => new {
            id = p.Id.ToString(),
            title = p.Name,
            vietnameseTitle = p.Name,
            price = p.Price,
            legacyPrice = p.Price,
            region = p.Region,
            material = p.Material,
            image = p.ImageUrl,
            desc = p.Description,
            badge = p.IsHighlight ? "Featured" : "",
            productType = p.ProductType.ToString()
        });
        return Ok(mapped);
    }
}
