using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class CharacterRepository : ICharacterRepository
{
    private readonly ApplicationDbContext _db;
    public CharacterRepository(ApplicationDbContext db) { _db = db; }

    public Task<Character?> GetByRegionAsync(string region, CancellationToken ct = default) =>
        _db.Characters.FirstOrDefaultAsync(c => c.Region == region, ct);
}
