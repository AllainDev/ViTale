using Application.DTOs;
using Application.Interfaces.Services;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

namespace Infrastructure.Services;

/// <summary>
/// Postgres full-text search over curated Hà Nội KB.
/// Uses `websearch_to_tsquery` for natural queries + `ts_rank` for ordering.
/// `f_unaccent_immutable` makes "hoan kiem" match "Hoàn Kiếm" without breaking
/// the IMMUTABLE requirement of the generated `search_vector` column.
/// </summary>
public class HanoiKnowledgeService : IHanoiKnowledgeService
{
    private readonly ApplicationDbContext _db;

    public HanoiKnowledgeService(ApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<HanoiKnowledgeChunk>> SearchAsync(
        string query, string language, int topK = 3,
        string? category = null, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return Array.Empty<HanoiKnowledgeChunk>();
        if (topK <= 0) return Array.Empty<HanoiKnowledgeChunk>();

        // Parameterized SQL keeps us injection-safe; websearch_to_tsquery handles
        // natural-language operators (& | ! "). Using 'simple' config + the
        // IMMUTABLE wrapper f_unaccent_immutable matches the STORED generated
        // column on `search_vector`.
        var rows = await _db.HanoiKnowledges
            .FromSqlRaw("""
                SELECT * FROM hanoi_knowledge
                WHERE is_active = true
                  AND language = {0}
                  AND ({1} IS NULL OR category = {1})
                  AND search_vector @@ websearch_to_tsquery('simple', f_unaccent_immutable({2}))
                ORDER BY ts_rank(search_vector, websearch_to_tsquery('simple', f_unaccent_immutable({2}))) DESC
                LIMIT {3}
                """, language, category, query, topK)
            .AsNoTracking()
            .ToListAsync(ct);

        return rows.Select(r => new HanoiKnowledgeChunk(
            r.Topic, r.Question, r.Answer, r.Source, r.Category
        )).ToList();
    }
}
