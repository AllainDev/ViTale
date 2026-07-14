### Task 1: Domain entity + EF mapping

**Files:**
- Create: `backend/Domain/Entities/HanoiKnowledge.cs`
- Modify: `backend/Infrastructure/Persistence/ApplicationDbContext.cs:30-33, 420-453`

**Interfaces:**
- Produces: `Domain.Entities.HanoiKnowledge` entity (used by migration in Task 2, retrieval in Task 5)

- [ ] **Step 1: Create the entity file**

Create `backend/Domain/Entities/HanoiKnowledge.cs`:

```csharp
using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Curated Hà Nội knowledge base entries used for RAG-lite retrieval
/// (Postgres full-text search) so the AI guide has grounded facts instead
/// of relying on the LLM's general knowledge.
/// </summary>
public class HanoiKnowledge
{
    public Guid Id { get; private set; }
    public string Category { get; private set; } = string.Empty;
    public string Topic { get; private set; } = string.Empty;
    public string Question { get; private set; } = string.Empty;
    public string Answer { get; private set; } = string.Empty;
    public string? Keywords { get; private set; }
    public string Language { get; private set; } = string.Empty;
    public string? Source { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    protected HanoiKnowledge() { }

    public static HanoiKnowledge Create(
        string category, string topic, string question, string answer,
        string language, string? keywords = null, string? source = null)
    {
        if (language != "vi" && language != "en")
            throw new ArgumentException("Language must be 'vi' or 'en'", nameof(language));
        if (string.IsNullOrWhiteSpace(question))
            throw new ArgumentException("Question required", nameof(question));
        if (string.IsNullOrWhiteSpace(answer))
            throw new ArgumentException("Answer required", nameof(answer));

        return new HanoiKnowledge
        {
            Id = Guid.NewGuid(),
            Category = category.Trim().ToLowerInvariant(),
            Topic = topic.Trim(),
            Question = question.Trim(),
            Answer = answer.Trim(),
            Keywords = keywords?.Trim(),
            Language = language,
            Source = source?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Deactivate() => IsActive = false;
}
```

- [ ] **Step 2: Add DbSet + model config to ApplicationDbContext**

Edit `backend/Infrastructure/Persistence/ApplicationDbContext.cs`:

After line 33 (`public DbSet<UserBadge> UserBadges => Set<UserBadge>();`), add:

```csharp
public DbSet<HanoiKnowledge> HanoiKnowledges => Set<HanoiKnowledge>();
```

After the `UserBadge` model config (after line 484), add new config block:

```csharp
// ── HanoiKnowledge ──────────────────────────────────────
modelBuilder.Entity<HanoiKnowledge>(e =>
{
    e.ToTable("hanoi_knowledge");
    e.HasKey(x => x.Id);
    e.Property(x => x.Id).HasColumnName("id");
    e.Property(x => x.Category).HasColumnName("category").HasMaxLength(50).IsRequired();
    e.Property(x => x.Topic).HasColumnName("topic").HasMaxLength(200).IsRequired();
    e.Property(x => x.Question).HasColumnName("question").IsRequired();
    e.Property(x => x.Answer).HasColumnName("answer").IsRequired();
    e.Property(x => x.Keywords).HasColumnName("keywords");
    e.Property(x => x.Language).HasColumnName("language").HasMaxLength(2).IsRequired();
    e.Property(x => x.Source).HasColumnName("source").HasMaxLength(200);
    e.Property(x => x.IsActive).HasColumnName("is_active").HasDefaultValue(true);
    e.Property(x => x.CreatedAt).HasColumnName("created_at");

    e.HasIndex(x => x.Language).HasDatabaseName("idx_hanoi_knowledge_lang")
        .HasFilter("is_active = true");
    e.HasIndex(x => x.Category).HasDatabaseName("idx_hanoi_knowledge_category")
        .HasFilter("is_active = true");
});
```

Add `using Domain.Entities;` if not already present (check top of file).

- [ ] **Step 3: Build to verify**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -10
```

Expected: `Build succeeded` with no errors. If errors about missing `using Domain.Entities;`, add it.

- [ ] **Step 4: Commit**

```bash
git add backend/Domain/Entities/HanoiKnowledge.cs backend/Infrastructure/Persistence/ApplicationDbContext.cs
git commit -m "feat: add HanoiKnowledge entity + EF mapping"
```

---

