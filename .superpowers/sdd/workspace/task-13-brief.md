### Task 13: ChatProviderChainBuilder — reads .env, builds chain

**Files:**
- Create: `backend/Infrastructure/Services/ChatProviderChainBuilder.cs`

- [ ] **Step 1: Create builder**

Create `backend/Infrastructure/Services/ChatProviderChainBuilder.cs`:

```csharp
using Application.Interfaces.Services;
using Infrastructure.Services.Providers;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Reads .env configuration and builds a ChatProviderChain with:
///   - 1+ GroqChatProvider (from comma-separated GROQ_API_KEYS)
///   - 1 MiniMaxChatProvider (if MINIMAX_API_KEY is set)
///
/// Convention: among enabled providers, the last one in .env order has lowest
/// priority number (= highest priority). I.e. the LAST enabled provider becomes
/// the primary (Priority=0); earlier ones are fallback (Priority=1, 2, ...).
///
/// To make MiniMax the primary: place MINIMAX_* AFTER GROQ_* in .env (last in file = primary).
/// </summary>
public class ChatProviderChainBuilder
{
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILoggerFactory _loggerFactory;

    public ChatProviderChainBuilder(IHttpClientFactory httpFactory, ILoggerFactory loggerFactory)
    {
        _httpFactory = httpFactory;
        _loggerFactory = loggerFactory;
    }

    public ChatProviderChain Build()
    {
        var providers = new List<IChatProvider>();
        int priority = 0;

        // ── Groq providers (from comma-separated keys) ──
        var groqKeys = Environment.GetEnvironmentVariable("GROQ_API_KEYS");
        if (!string.IsNullOrWhiteSpace(groqKeys))
        {
            var groqBaseUrl = Environment.GetEnvironmentVariable("GROQ_BASE_URL")
                              ?? "https://api.groq.com/openai/v1";
            var groqModel = Environment.GetEnvironmentVariable("GROQ_MODEL")
                            ?? "llama-3.1-8b-instant";

            var keys = groqKeys.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            // Earlier keys = higher priority (fallback); last key = lowest priority number = primary
            for (int i = 0; i < keys.Length; i++)
            {
                providers.Add(new GroqChatProvider(
                    _httpFactory,
                    _loggerFactory.CreateLogger<GroqChatProvider>(),
                    name: $"groq-{i + 1}",
                    apiKey: keys[i],
                    baseUrl: groqBaseUrl,
                    model: groqModel,
                    priority: priority++
                ));
            }
        }

        // ── MiniMax (if enabled) ──
        var minimaxKey = Environment.GetEnvironmentVariable("MINIMAX_API_KEY");
        if (!string.IsNullOrWhiteSpace(minimaxKey))
        {
            var minimaxBaseUrl = Environment.GetEnvironmentVariable("MINIMAX_BASE_URL")
                                 ?? "https://api.minimax.chat/v1";
            var minimaxModel = Environment.GetEnvironmentVariable("MINIMAX_MODEL")
                               ?? "MiniMax-Text-01";

            providers.Add(new MiniMaxChatProvider(
                _httpFactory,
                _loggerFactory.CreateLogger<MiniMaxChatProvider>(),
                name: "minimax",
                apiKey: minimaxKey,
                baseUrl: minimaxBaseUrl,
                model: minimaxModel,
                priority: priority++,  // gets next priority number (last in .env = lowest number = primary)
                supportsToolCalling: false  // assume no tool support for MVP
            ));
        }

        if (providers.Count == 0)
            throw new InvalidOperationException(
                "No chat providers configured. Set GROQ_API_KEYS or MINIMAX_API_KEY in .env.");

        var chain = new ChatProviderChain(providers, _loggerFactory.CreateLogger<ChatProviderChain>());
        return chain;
    }
}
```

- [ ] **Step 2: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -5
```

Expected: `Build succeeded`.

- [ ] **Step 3: Commit**

```bash
git add backend/Infrastructure/Services/ChatProviderChainBuilder.cs
git commit -m "feat: ChatProviderChainBuilder reads .env and builds provider chain"
```

---

