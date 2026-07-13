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
        var mapped = items.Select(i => new {
            id = i.Id.ToString(),
            title = i.Name,
            vietnameseTitle = i.Name,
            price = i.Price,
            legacyPrice = i.Price,
            region = i.Region,
            material = i.Material,
            image = i.ImageUrl,
            desc = i.Description,
            badge = i.IsHighlight ? "Featured" : ""
        });
        return Ok(mapped);
    }

    [HttpPost("api/v1/collections/seed")]
    public async Task<IActionResult> Seed()
    {
        await _db.Database.ExecuteSqlRawAsync("DELETE FROM collection_items");
        var items = new[]
        {
            (Guid.NewGuid(), "Crochet Heritage Doll", "Northern", "Hand-woven representation of traditional northern attire, crafted with zero-waste principles.", "Organic Cotton", "₫850,000", "https://lh3.googleusercontent.com/aida-public/AB6AXuBLbsUJJHJf6fFCamOHj56yiZbVNNMxY7XT8Y8zx3ugcLUx_wwUUo0oDgNL2X44WOiuBUMzCqJ64PkEkHVz3SfKnI5aDLun8nu0rgadQyFoeQ_wu0TdgIC9aecQJwVMsLJbiTqRLxVRy7V7HQfwkmpEKR8OVquGpwBqOTFdbSTbdsOitOUjV3-tNtUUH5W7KHbwS1aPbi5fBLLMOVO6249BACsc3E_en2xlzEC66tPYXNzA4SQEF-huRw", true),
            (Guid.NewGuid(), "Handmade Passport Cover", "Central", "Linen and pressed rice paper cover to protect your physical and digital memories.", "Recycled Paper", "₫450,000", "https://lh3.googleusercontent.com/aida-public/AB6AXuBsRmuef2oH4srUsQl77SBfVt3ZjPSJoP3fr3Wsr-JyWvmZMG_CmLW8SXUo5kfXP__U9GPvajLkirusOq7YMmgf4mi9kBi9vERj9uSidn3UBLLVTERE0UnGUx4GLlPS0Gj3mRVCTLTb9YXGBzP3WvDQk2i7hG34g-AcOxZLHdIOl4dY7Y7xDq_VF_8zxX79BM_WMfGpUiNMNAoGaofxgQ97R0CVzST0EYgSaPlwf3Hz-cXY-UnpWZgLuw", true),
            (Guid.NewGuid(), "Saigon Eco-Boutique Gift Set", "Southern", "A curated collection of sustainable luxuries featuring organic silk and natural botanicals.", "Silk", "850k VND", "https://lh3.googleusercontent.com/aida-public/AB6AXuDFyc0QKuwo_YYHnDwpArZdLqOZeYfmoQaZ4JDfDg0r7CJOkaEqw-IWSa9iZQv2H3t5ecrnqST_bIfW47K8fZXl0xy5LReLde5oOZgzXpNrROvOv8KKI0jG9iyJLj3naug0wNB5uo-elOXH8_TsG7IXZvoVKcYLxYghrVOWOX69m7XCyuI2rR7SSAqT9mxu6_bJ50JtVj3zRG1ITTVrg5qDHG0prAIoZL6ooXqnPgrm-KMsoSC0T-rX5g", true),
            (Guid.NewGuid(), "Sapa Indigo Charm", "Northern", "Hand-woven by the Hmong community using traditional loom techniques and deep natural indigo.", "Organic Cotton", "210k VND", "https://lh3.googleusercontent.com/aida-public/AB6AXuCPI5wMGtwxL23PMqLh8FW9qS5HraW2fwsQ1Aa3prY8sJ85Q4zidde0JcUapiKkFxtYi5oZKODf7rK5dpRFrnlMOBWrHL9ww1y8cGX1WT2oF-Q42lfWvZJ7mfbKNNfkBjKpjGtrkpUjbE6hYRdCP3NwdzeE8HEM9ZFtOIofYnKn5bIVurrM9NqKP52Ie4hkx9Zpz4OvPzUQ_H6XI3k2TDHurmm_s_cfvNYorDhhcj46Rj_NhsivZfjxyQ", false)
        };
        foreach (var (id, name, region, desc, material, price, img, highlight) in items)
        {
            await _db.Database.ExecuteSqlRawAsync("""
                INSERT INTO collection_items (id, name, region, description, material, price, image_url, is_highlight, is_deleted)
                VALUES ({0}, {1}, {2}, {3}, {4}, {5}, {6}, {7}, false)
                """,
                id, name, region, desc, material, price, img, highlight);
        }
        return Ok(new { success = true });
    }
}
