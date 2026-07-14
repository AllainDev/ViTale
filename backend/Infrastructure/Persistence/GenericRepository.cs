using Application.Interfaces.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    private readonly ApplicationDbContext _db;

    public GenericRepository(ApplicationDbContext db)
    {
        _db = db;
    }

    public IQueryable<T> Query() => _db.Set<T>();

    public async Task<T?> GetByIdAsync(object[] keyValues, CancellationToken ct = default)
    {
        return await _db.Set<T>().FindAsync(keyValues, ct);
    }

    public void Add(T entity) => _db.Set<T>().Add(entity);

    public void Update(T entity) => _db.Set<T>().Update(entity);

    public void Remove(T entity) => _db.Set<T>().Remove(entity);
}
