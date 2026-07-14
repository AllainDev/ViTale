using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class ProductRepository : IProductRepository
{
    private readonly ApplicationDbContext _db;
    public ProductRepository(ApplicationDbContext db) { _db = db; }

    public Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _db.Products.FindAsync([id], ct).AsTask();

    public async Task UpdateAsync(Product product, CancellationToken ct = default)
    {
        _db.Products.Update(product);
        await _db.SaveChangesAsync(ct);
    }

    public Task<Product?> GetDollByRegionAsync(string region, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(region)) return Task.FromResult<Product?>(null);
        var normalised = region.Trim().ToLower();
        return _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(
                p => p.ProductType == ProductType.Doll && p.Region.ToLower() == normalised,
                ct);
    }

    public Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sku)) return Task.FromResult<Product?>(null);
        return _db.Products
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Sku == sku, ct);
    }
}
