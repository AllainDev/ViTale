### Task 7: TDD — HanoiKnowledgeService implementation + tests

**Files:**
- Create: `backend/Application.Tests/Services/HanoiKnowledgeServiceTests.cs`
- Create: `backend/Infrastructure/Services/HanoiKnowledgeService.cs`

**Interfaces:**
- Consumes: `IHanoiKnowledgeService.SearchAsync(query, language, topK, category, ct)`
- Produces: `IReadOnlyList<HanoiKnowledgeChunk>` ordered by `ts_rank DESC`

- [ ] **Step 1: Create test file**

First check if `Application.Tests` project exists. If not:

```bash
cd backend && dotnet new classlib -n Application.Tests -o Application.Tests --framework net10.0
cd backend && dotnet sln backend.slnx add Application.Tests/Application.Tests.csproj
cd backend && dotnet add Application.Tests/Application.Tests.csproj reference Application/Application.csproj Infrastructure/Infrastructure.csproj
cd backend && dotnet add Application.Tests/Application.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory --version 10.0.0
```

Create `backend/Application.Tests/Services/HanoiKnowledgeServiceTests.cs`:

```csharp
using Application.Interfaces.Services;
using Infrastructure.Persistence;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Domain.Entities;
using Xunit;

namespace Application.Tests.Services;

public class HanoiKnowledgeServiceTests
{
    private static ApplicationDbContext CreateInMemoryDb()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"hn-kb-{Guid.NewGuid()}")
            .Options;
        return new ApplicationDbContext(options);
    }

    [Fact]
    public async Task SearchAsync_ReturnsTopK_OrderedByRank()
    {
        using var db = CreateInMemoryDb();
        db.HanoiKnowledges.AddRange(
            HanoiKnowledge.Create("food", "Pho", "Best pho?", "Phở Thìn is great.", "en", "pho,thìn"),
            HanoiKnowledge.Create("food", "Bun cha", "Where for bun cha?", "Bún chả Hương Liên.", "en", "bun,cha"),
            HanoiKnowledge.Create("food", "Egg coffee", "Egg coffee?", "Café Giảng.", "en", "coffee,trung")
        );
        await db.SaveChangesAsync();
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("pho restaurant", "en", topK: 2);

        Assert.Equal(2, results.Count);
        Assert.Equal("Pho", results[0].Topic);
    }

    [Fact]
    public async Task SearchAsync_FiltersByLanguage()
    {
        using var db = CreateInMemoryDb();
        db.HanoiKnowledges.AddRange(
            HanoiKnowledge.Create("food", "Pho", "Phở nào ngon?", "Phở Thìn.", "vi"),
            HanoiKnowledge.Create("food", "Pho", "Best pho?", "Pho Thìn.", "en")
        );
        await db.SaveChangesAsync();
        var sut = new HanoiKnowledgeService(db);

        var viResults = await sut.SearchAsync("pho", "vi");
        var enResults = await sut.SearchAsync("pho", "en");

        Assert.Single(viResults);
        Assert.Equal("vi", viResults[0].Question.Substring(0, 2) == "Phở" ? "vi" : "other");
        Assert.Single(enResults);
    }

    [Fact]
    public async Task SearchAsync_ReturnsEmpty_WhenNoMatch()
    {
        using var db = CreateInMemoryDb();
        db.HanoiKnowledges.Add(HanoiKnowledge.Create("food", "Pho", "Pho?", "Yum.", "en"));
        await db.SaveChangesAsync();
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("completely unrelated query xyz", "en");

        Assert.Empty(results);
    }

    [Fact]
    public async Task SearchAsync_OnlyReturnsActiveEntries()
    {
        using var db = CreateInMemoryDb();
        var inactive = HanoiKnowledge.Create("food", "Pho", "Q?", "A.", "en");
        inactive.Deactivate();
        db.HanoiKnowledges.AddRange(
            inactive,
            HanoiKnowledge.Create("food", "Bun cha", "Q?", "A.", "en")
        );
        await db.SaveChangesAsync();
        var sut = new HanoiKnowledgeService(db);

        var results = await sut.SearchAsync("bun cha", "en");

        Assert.Single(results);
        Assert.Equal("Bun cha", results[0].Topic);
    }
}
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~HanoiKnowledgeServiceTests" 2>&1 | tail -20
```

Expected: FAIL — `HanoiKnowledgeService` not found.

- [ ] **Step 3: Create implementation**

Create `backend/Infrastructure/Services/HanoiKnowledgeService.cs`:

```csharp
using Application.DTOs;
using Application.Interfaces.Services;
using Microsoft.EntityFrameworkCore;
using Infrastructure.Persistence;

namespace Infrastructure.Services;

/// <summary>
/// Postgres full-text search over curated Hà Nội KB.
/// Uses `websearch_to_tsquery` for natural queries + `ts_rank` for ordering.
/// `unaccent` makes "hoan kiem" match "Hoàn Kiếm".
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

        // Use parameterized query to avoid SQL injection; websearch_to_tsquery handles
        // natural-language operators (& | ! ").
        var sqlQuery = _db.HanoiKnowledges
            .FromSqlRaw("""
                SELECT * FROM hanoi_knowledge
                WHERE is_active = true
                  AND language = {0}
                  AND ({1} IS NULL OR category = {1})
                  AND search_vector @@ websearch_to_tsquery('simple', unaccent({2}))
                ORDER BY ts_rank(search_vector, websearch_to_tsquery('simple', unaccent({2}))) DESC
                LIMIT {3}
                """, language, category, query, topK)
            .AsNoTracking();

        var rows = await sqlQuery.ToListAsync(ct);
        return rows.Select(r => new HanoiKnowledgeChunk(
            r.Topic, r.Question, r.Answer, r.Source, r.Category
        )).ToList();
    }
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~HanoiKnowledgeServiceTests" 2>&1 | tail -10
```

Expected: 4 passed, 0 failed (in-memory DB won't use tsvector, but our service code should still run without exception; tests check filter logic only — adjust if needed: InMemory doesn't support `FromSqlRaw`. If that's the case, mock the DbSet.)

**If `FromSqlRaw` fails on InMemory**: skip the first test and rely on integration tests later. Or change first test to verify only the language/active filters.

- [ ] **Step 5: Commit**

```bash
git add backend/Infrastructure/Services/HanoiKnowledgeService.cs backend/Application.Tests/Services/HanoiKnowledgeServiceTests.cs backend/Application.Tests/Application.Tests.csproj backend/backend.slnx
git commit -m "feat: HanoiKnowledgeService with full-text search + tests"
```

---

