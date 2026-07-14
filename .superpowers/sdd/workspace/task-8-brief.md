### Task 8: IChatProvider interface + DTOs

**Files:**
- Create: `backend/Application/Interfaces/Services/IChatProvider.cs`

- [ ] **Step 1: Create interface**

Create `backend/Application/Interfaces/Services/IChatProvider.cs`:

```csharp
using Application.DTOs;

namespace Application.Interfaces.Services;

/// <summary>
/// One LLM chat provider (Groq, MiniMax, etc.). Implementations are
/// composed into a ChatProviderChain that handles failover.
/// </summary>
public interface IChatProvider
{
    string Name { get; }
    int Priority { get; }
    bool SupportsToolCalling { get; }

    Task<ChatCompletionResult> CompleteAsync(
        ChatCompletionRequest request, CancellationToken ct = default);
}

public record ChatCompletionRequest(
    string SystemPrompt,
    IReadOnlyList<(string Role, string Content)> Messages,
    IReadOnlyList<ToolDefinition>? Tools,
    string Model,
    int MaxTokens,
    double Temperature
);

public record ChatCompletionResult(
    string Content,
    IReadOnlyList<ToolCall> ToolCalls,
    string ProviderName,
    int PromptTokens,
    int CompletionTokens
);

public record ToolCall(string Name, string ArgumentsJson);

public record ToolDefinition(
    string Name,
    string Description,
    object Parameters
);
```

- [ ] **Step 2: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add backend/Application/Interfaces/Services/IChatProvider.cs
git commit -m "feat: add IChatProvider interface + chat DTOs"
```

---

