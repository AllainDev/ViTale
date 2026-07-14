using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);

    /// <summary>
    /// Returns the Doll product (ProductType.Doll) whose region matches, ignoring
    /// casing and surrounding whitespace, or <c>null</c> when no such doll exists.
    /// Used by the admin "create doll model" flow to make the call idempotent:
    /// if a Doll already exists for the requested region, return it instead of
    /// creating a duplicate.
    /// </summary>
    Task<Product?> GetDollByRegionAsync(string region, CancellationToken ct = default);

    /// <summary>
    /// Returns the product whose SKU matches exactly, or <c>null</c>.
    /// </summary>
    Task<Product?> GetBySkuAsync(string sku, CancellationToken ct = default);
}
