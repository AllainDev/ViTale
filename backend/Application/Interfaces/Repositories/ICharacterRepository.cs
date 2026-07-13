using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ICharacterRepository
{
    Task<Character?> GetByRegionAsync(string region, CancellationToken ct = default);
}
