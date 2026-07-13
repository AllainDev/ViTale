using Microsoft.EntityFrameworkCore;
using Application.Interfaces.Repositories;
using Domain.Entities;
using Infrastructure.Persistence;

namespace Infrastructure.Repositories;

public class TranslationRepository : ITranslationRepository
{
    private readonly ApplicationDbContext _db;
    public TranslationRepository(ApplicationDbContext db) { _db = db; }

    public async Task<string?> GetAsync(string languageCode, string contentKey, CancellationToken ct = default)
    {
        var t = await _db.Translations.FirstOrDefaultAsync(t =>
            t.LanguageCode == languageCode && t.ContentKey == contentKey, ct);
        return t?.ContentValue;
    }
}
