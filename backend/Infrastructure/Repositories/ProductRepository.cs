using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
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
}
