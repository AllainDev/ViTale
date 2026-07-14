### Task 11: MiniMaxChatProvider

**Files:**
- Create: `backend/Infrastructure/Services/Providers/MiniMaxChatProvider.cs`

- [ ] **Step 1: Create provider (assume OpenAI-compatible API)**

Create `backend/Infrastructure/Services/Providers/MiniMaxChatProvider.cs`:

```csharp
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Providers;

/// <summary>
/// MiniMax (minimax.chat) LLM provider. Assumes OpenAI-compatible API.
/// If MiniMax doesn't support tool calling, set SupportsToolCalling=false;
/// ChatToolExecutor will skip tool flow for responses from this provider.
/// </summary>
public class MiniMaxChatProvider : IChatProvider
{
    private readonly HttpClient _http;
    private readonly ILogger<MiniMaxChatProvider> _logger;
    private readonly string _name;
    private readonly string _model;

    public string Name => _name;
    public int Priority { get; }
    public bool SupportsToolCalling { get; }

    public MiniMaxChatProvider(
        IHttpClientFactory factory, ILogger<MiniMaxChatProvider> logger,
        string name, string apiKey, string baseUrl, string model, int priority,
        bool supportsToolCalling)
    {
        _http = factory.CreateClient("MiniMaxProvider_" + name);
        if (_http.BaseAddress == null)
            _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.Timeout = TimeSpan.FromSeconds(30);
        _logger = logger;
        _name = name;
        _model = model;
        Priority = priority;
        SupportsToolCalling = supportsToolCalling;
    }

    public async Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest req, CancellationToken ct = default)
    {
        // Same wire format as OpenAI/Groq. If MiniMax uses a different format,
        // customize here.
        var messages = new List<object>
        {
            new { role = "system", content = req.SystemPrompt }
        };
        foreach (var (role, content) in req.Messages)
        {
            messages.Add(new { role, content });
        }

        object body = new
        {
            model = _model,
            messages,
            temperature = req.Temperature,
            max_tokens = req.MaxTokens
        };

        var json = JsonSerializer.Serialize(body);
        var response = await _http.PostAsync("v1/chat/completions",
            new StringContent(json, Encoding.UTF8, "application/json"), ct);

        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync(ct);
            throw new HttpRequestException($"MiniMax API {response.StatusCode}: {err}");
        }

        var result = await response.Content.ReadFromJsonAsync<MiniMaxResponse>(ct)
            ?? throw new InvalidOperationException("Empty MiniMax response");
        var choice = result.choices.First();

        return new ChatCompletionResult(
            Content: choice.message?.content ?? "",
            ToolCalls: Array.Empty<ToolCall>(),
            ProviderName: _name,
            PromptTokens: result.usage?.prompt_tokens ?? 0,
            CompletionTokens: result.usage?.completion_tokens ?? 0
        );
    }

    private class MiniMaxResponse
    {
        public List<MiniMaxChoice> choices { get; set; } = new();
        public MiniMaxUsage? usage { get; set; }
    }
    private class MiniMaxChoice
    {
        public MiniMaxMessage? message { get; set; }
    }
    private class MiniMaxMessage
    {
        public string? content { get; set; }
    }
    private class MiniMaxUsage
    {
        public int prompt_tokens { get; set; }
        public int completion_tokens { get; set; }
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
git add backend/Infrastructure/Services/Providers/MiniMaxChatProvider.cs
git commit -m "feat: add MiniMaxChatProvider (OpenAI-compatible)"
```

---

