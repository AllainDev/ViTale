### Task 12: TDD — ChatProviderChain

**Files:**
- Create: `backend/Application.Tests/Services/ChatProviderChainTests.cs`
- Create: `backend/Infrastructure/Services/ChatProviderChain.cs`

- [ ] **Step 1: Create test file**

Create `backend/Application.Tests/Services/ChatProviderChainTests.cs`:

```csharp
using Application.Interfaces.Services;
using Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Application.Tests.Services;

public class ChatProviderChainTests
{
    private class FakeProvider : IChatProvider
    {
        public string Name { get; }
        public int Priority { get; }
        public bool SupportsToolCalling => true;
        public int CallCount { get; private set; }
        public Func<int, ChatCompletionResult>? OnCall { get; set; }

        public FakeProvider(string name, int priority, Func<int, ChatCompletionResult>? onCall = null)
        {
            Name = name;
            Priority = priority;
            OnCall = onCall;
        }

        public Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest req, CancellationToken ct = default)
        {
            CallCount++;
            if (OnCall != null) return Task.FromResult(OnCall(CallCount));
            return Task.FromResult(new ChatCompletionResult("ok", Array.Empty<ToolCall>(), Name, 0, 0));
        }
    }

    [Fact]
    public async Task CompleteAsync_CallsPrimaryProvider_WhenItSucceeds()
    {
        var primary = new FakeProvider("primary", 0);
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        var result = await chain.CompleteAsync(new ChatCompletionRequest(
            "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7));

        Assert.Equal("primary", result.ProviderName);
        Assert.Equal(1, primary.CallCount);
        Assert.Equal(0, fallback.CallCount);
    }

    [Fact]
    public async Task CompleteAsync_FallsBackToSecondary_WhenPrimaryThrows()
    {
        var primary = new FakeProvider("primary", 0, _ => throw new HttpRequestException("fail"));
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        var result = await chain.CompleteAsync(new ChatCompletionRequest(
            "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7));

        Assert.Equal("fallback", result.ProviderName);
        Assert.Equal(1, primary.CallCount);
        Assert.Equal(1, fallback.CallCount);
    }

    [Fact]
    public async Task CompleteAsync_ThrowsAggregate_WhenAllProvidersFail()
    {
        var p1 = new FakeProvider("p1", 0, _ => throw new HttpRequestException("fail1"));
        var p2 = new FakeProvider("p2", 1, _ => throw new HttpRequestException("fail2"));
        var chain = new ChatProviderChain(new[] { p1, p2 }, NullLogger<ChatProviderChain>.Instance);

        await Assert.ThrowsAsync<AggregateException>(() =>
            chain.CompleteAsync(new ChatCompletionRequest(
                "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7)));
    }

    [Fact]
    public async Task CompleteAsync_DoesNotFallback_OnNonRetryableError()
    {
        var primary = new FakeProvider("primary", 0, _ => throw new ArgumentException("bad arg"));
        var fallback = new FakeProvider("fallback", 1);
        var chain = new ChatProviderChain(new[] { primary, fallback }, NullLogger<ChatProviderChain>.Instance);

        await Assert.ThrowsAsync<ArgumentException>(() =>
            chain.CompleteAsync(new ChatCompletionRequest(
                "sys", Array.Empty<(string, string)>(), null, "model", 100, 0.7)));
        Assert.Equal(0, fallback.CallCount);
    }
}
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~ChatProviderChainTests" 2>&1 | tail -10
```

Expected: FAIL — `ChatProviderChain` not found.

- [ ] **Step 3: Create implementation**

Create `backend/Infrastructure/Services/ChatProviderChain.cs`:

```csharp
using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Composes multiple IChatProvider instances into a failover chain.
/// Tries providers in priority order (0 = primary). On retryable errors
/// (HTTP/network), falls back to the next provider. On non-retryable errors
/// (bad arguments), re-throws immediately.
/// </summary>
public class ChatProviderChain : IChatProvider
{
    private readonly IReadOnlyList<IChatProvider> _providers;
    private readonly ILogger<ChatProviderChain> _logger;

    public string Name => _providers.FirstOrDefault()?.Name ?? "empty-chain";
    public int Priority => _providers.FirstOrDefault()?.Priority ?? 0;
    public bool SupportsToolCalling => _providers.Any(p => p.SupportsToolCalling);

    public ChatProviderChain(IReadOnlyList<IChatProvider> providers, ILogger<ChatProviderChain> logger)
    {
        _providers = providers.OrderBy(p => p.Priority).ToList();
        _logger = logger;
    }

    public async Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest request, CancellationToken ct = default)
    {
        var errors = new List<Exception>();
        foreach (var provider in _providers)
        {
            try
            {
                var result = await provider.CompleteAsync(request, ct);
                if (errors.Count > 0)
                    _logger.LogInformation("Provider {Name} succeeded after {N} retries", provider.Name, errors.Count);
                return result;
            }
            catch (Exception ex) when (IsRetryable(ex))
            {
                _logger.LogWarning("Provider {Name} failed: {Error}. Trying next.", provider.Name, ex.Message);
                errors.Add(ex);
            }
        }
        throw new AggregateException("All chat providers failed", errors);
    }

    private static bool IsRetryable(Exception ex)
        => ex is HttpRequestException
        || ex is TaskCanceledException
        || ex is InvalidOperationException ioe && ioe.Message.Contains("rate", StringComparison.OrdinalIgnoreCase);
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~ChatProviderChainTests" 2>&1 | tail -10
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/Infrastructure/Services/ChatProviderChain.cs backend/Application.Tests/Services/ChatProviderChainTests.cs
git commit -m "feat: ChatProviderChain with failover logic + tests"
```

---

