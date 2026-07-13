using Domain.Entities;

namespace Application.Interfaces.Repositories;

public interface ITranslationRepository
{
    Task<string?> GetAsync(string languageCode, string contentKey, CancellationToken ct = default);
}
