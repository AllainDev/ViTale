using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface IProductRepository
{
    Task<Product?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task UpdateAsync(Product product, CancellationToken ct = default);
}
