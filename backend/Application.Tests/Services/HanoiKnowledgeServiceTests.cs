using Application.DTOs;
using Application.Interfaces.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace Application.Tests.Services;

/// <summary>
/// Integration tests for <see cref="HanoiKnowledgeService"/>.
/// These run against the real Postgres container (vitale_db) because EF Core's
/// InMemory provider does not support <c>FromSqlRaw</c>, and Postgres is the
/// only provider that can evaluate <c>tsvector @@ websearch_to_tsquery(...)</c>.
/// Connection string is read from <c>DB_CONNECTION_STRING</c> or defaults to
/// the local docker dev DB. Each test seeds its own rows under a unique
/// category so concurrent runs do not collide.
/// </summary>
public class HanoiKnowledgeServiceTests
{
    private const string DefaultConn =
        "Host=localhost;Port=5432;Database=vitale_db;Username=postgres;Password=vitale_dev_password";

    private static string UniqueCategory(string suffix) => $"test_{Guid.NewGuid():N}_{suffix}";

    private static ApplicationDbContext CreateDbContext()
    {
        var conn = Environment.GetEnvironmentVariable("DB_CONNECTION_STRING") ?? DefaultConn;
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseNpgsql(conn)
            .Options;
        return new ApplicationDbContext(options);
    }

    private static async Task<string> SeedAsync(
        ApplicationDbContext db, params HanoiKnowledge[] entries)
    {
        db.HanoiKnowledges.AddRange(entries);
        await db.SaveChangesAsync();
        return entries[0].Category; // tests share a category within one fixture
    }

    [Fact]
    public async Task SearchAsync_ReturnsTopK_OrderedByRank()
    {
        // 'websearch_to_tsquery' joins multi-word queries with AND, so the
        // 'Pho' row must out-rank the 'Bun cha' row when both match the
        // multi-word query. Use a 2-word query that matches both rows,
        // boosting rank on Pho (more mentions of "restaurant").
        var category = UniqueCategory("topk");
        await using var db = CreateDbContext();
        await SeedAsync(db,
            HanoiKnowledge.Create(category, "Pho", "Best pho?", "Pho Thìn is great restaurant restaurant restaurant.", "en", "pho,thìn,restaurant"),
            HanoiKnowledge.Create(category, "Bun cha", "Where for bun cha?", "Bún chả restaurant near Pho Thìn.", "en", "bun,cha,restaurant,pho"));
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("pho restaurant", "en", topK: 2, category: category);

        try
        {
            Assert.Equal(2, results.Count);
            Assert.Equal("Pho", results[0].Topic);
        }
        finally
        {
            await CleanupAsync(db, category);
        }
    }

    [Fact]
    public async Task SearchAsync_FiltersByLanguage()
    {
        // Seed a VI row and an EN row in the SAME category. Querying in 'vi'
        // must return only the VI row; querying in 'en' must return only the
        // EN row. Categories match, so the only differentiator is the
        // language filter — HanoiKnowledgeChunk.Category is the same on
        // both rows so we instead verify count + topic distinctness.
        var category = UniqueCategory("lang");

        await using var db = CreateDbContext();
        await SeedAsync(db,
            HanoiKnowledge.Create(category, "Pho-VI", "Phở nào ngon?", "Phở Thìn.", "vi", "pho,vi,Thìn"),
            HanoiKnowledge.Create(category, "Pho-EN", "Best pho?", "Pho Thìn.", "en", "pho,en,thìn"));
        var sut = new HanoiKnowledgeService(db);

        var viResults = await sut.SearchAsync("pho", "vi", category: category);
        var enResults = await sut.SearchAsync("pho", "en", category: category);

        try
        {
            Assert.Single(viResults);
            Assert.Equal("Pho-VI", viResults[0].Topic);

            Assert.Single(enResults);
            Assert.Equal("Pho-EN", enResults[0].Topic);
        }
        finally
        {
            await CleanupAsync(db, category);
        }
    }

    [Fact]
    public async Task SearchAsync_ReturnsEmpty_WhenNoMatch()
    {
        var category = UniqueCategory("nomatch");
        await using var db = CreateDbContext();
        await SeedAsync(db, HanoiKnowledge.Create(category, "Pho", "Pho?", "Yum.", "en"));
        var sut = new HanoiKnowledgeService(db);

        // Websearch combines tokens with AND — every word must be in the document.
        var results = await sut.SearchAsync("completely unrelated query xyz123", "en", category: category);

        try
        {
            Assert.Empty(results);
        }
        finally
        {
            await CleanupAsync(db, category);
        }
    }

    [Fact]
    public async Task SearchAsync_OnlyReturnsActiveEntries()
    {
        var category = UniqueCategory("active");
        await using var db = CreateDbContext();
        var inactive = HanoiKnowledge.Create(category, "Pho", "Q pho?", "A pho.", "en", "pho,active");
        inactive.Deactivate();
        await SeedAsync(db,
            inactive,
            HanoiKnowledge.Create(category, "Bun cha", "Q bun cha?", "A bun cha.", "en", "bun,cha,active"));
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("bun cha", "en", category: category);

        try
        {
            Assert.Single(results);
            Assert.Equal("Bun cha", results[0].Topic);
        }
        finally
        {
            await CleanupAsync(db, category);
        }
    }

    [Fact]
    public async Task SearchAsync_UnaccentInsensitive()
    {
        // "Hoàn Kiếm" (Vietnamese diacritics) should match a query typed without
        // diacritics thanks to f_unaccent_immutable in both the generated column
        // and the runtime tsquery.
        var category = UniqueCategory("unaccent");
        await using var db = CreateDbContext();
        await SeedAsync(db,
            HanoiKnowledge.Create(category, "Hoan Kiem Lake",
                "Tell me about Hoàn Kiếm Lake.",
                "Hoàn Kiếm Lake is in the Old Quarter.",
                "en"));
        var sut = new HanoiKnowledgeService(db);

        // Query uses no diacritics — unaccent must normalize on both sides.
        var results = await sut.SearchAsync("hoan kiem", "en", category: category);

        try
        {
            Assert.NotEmpty(results);
            Assert.Equal("Hoan Kiem Lake", results[0].Topic);
        }
        finally
        {
            await CleanupAsync(db, category);
        }
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsEmpty()
    {
        await using var db = CreateDbContext();
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("", "en");
        var whitespace = await sut.SearchAsync("   ", "vi");

        Assert.Empty(results);
        Assert.Empty(whitespace);
    }

    [Fact]
    public async Task SearchAsync_CategoryFilter()
    {
        var catA = UniqueCategory("a");
        var catB = UniqueCategory("b");
        await using var db = CreateDbContext();
        await SeedAsync(db,
            HanoiKnowledge.Create(catA, "Pho in A", "Q pho?", "A pho.", "en", "pho,catA"),
            HanoiKnowledge.Create(catB, "Pho in B", "Q pho?", "A pho.", "en", "pho,catB"));
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("pho", "en", topK: 10, category: catA);

        try
        {
            Assert.Single(results);
            Assert.Equal(catA, results[0].Category);
        }
        finally
        {
            await CleanupAsync(db, catA);
            await CleanupAsync(db, catB);
        }
    }

    private static async Task CleanupAsync(ApplicationDbContext db, string category)
    {
        // Best-effort cleanup; tests share a database so each fixture isolates
        // itself via its unique category. We delete by category to keep the
        // delete simple and idempotent.
        var rows = await db.HanoiKnowledges
            .Where(k => k.Category == category)
            .ToListAsync();
        db.HanoiKnowledges.RemoveRange(rows);
        await db.SaveChangesAsync();
    }
}
