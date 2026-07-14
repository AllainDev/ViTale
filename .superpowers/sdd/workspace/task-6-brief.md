### Task 6: IHanoiKnowledgeService interface + DTO

**Files:**
- Create: `backend/Application/Interfaces/Services/IHanoiKnowledgeService.cs`
- Create: `backend/Application/DTOs/HanoiKnowledgeChunk.cs`

- [ ] **Step 1: Create chunk DTO**

Create `backend/Application/DTOs/HanoiKnowledgeChunk.cs`:

```csharp
namespace Application.DTOs;

/// <summary>
/// A single retrieved KB chunk used to ground the LLM's response.
/// </summary>
public record HanoiKnowledgeChunk(
    string Topic,
    string Question,
    string Answer,
    string? Source,
    string Category
);
```

- [ ] **Step 2: Create interface**

Create `backend/Application/Interfaces/Services/IHanoiKnowledgeService.cs`:

```csharp
using Application.DTOs;

namespace Application.Interfaces.Services;

/// <summary>
/// Retrieves relevant Hà Nội knowledge base chunks via Postgres full-text
/// search to inject into the chat LLM's system prompt (RAG-lite).
/// </summary>
public interface IHanoiKnowledgeService
{
    Task<IReadOnlyList<HanoiKnowledgeChunk>> SearchAsync(
        string query,
        string language,
        int topK = 3,
        string? category = null,
        CancellationToken ct = default);
}
```

- [ ] **Step 3: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded`.

- [ ] **Step 4: Commit**

```bash
git add backend/Application/DTOs/HanoiKnowledgeChunk.cs backend/Application/Interfaces/Services/IHanoiKnowledgeService.cs
git commit -m "feat: add HanoiKnowledgeService interface + chunk DTO"
```

---

