### Task 18: Update ChatController — integrate prompt + tools + new endpoint

**Files:**
- Modify: `backend/WebApi/Controllers/ChatController.cs`

- [ ] **Step 1: Replace SendMessage logic**

Open `ChatController.cs`. Replace the entire `SendMessage` method and class-level state to use the new prompt builder + provider chain + tool executor.

The new controller will:
1. Accept `language`, `gpsLat`, `gpsLon` in `SendChatMessageRequest`
2. Build `ChatPromptContext`
3. Call `ChatPromptBuilder.BuildSystemPromptAsync`
4. First LLM call with tools
5. If tools called → `ChatToolExecutor.ExecuteAsync` for each → second LLM call
6. Save both user + assistant messages
7. Return content + tags + toolCalls + kbSources

Full code in `backend/WebApi/Controllers/ChatController.cs`:

```csharp
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.DTOs.Tools;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Application.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;
using Infrastructure.Services.Providers;
using WebApi.Middleware;

namespace WebApi.Controllers;

public class ChatController : BaseController
{
    private readonly IChatSessionRepository _sessions;
    private readonly IChatMessageRepository _messages;
    private readonly ICheckpointRepository _checkpoints;
    private readonly IChatProvider _provider;
    private readonly ChatPromptBuilder _promptBuilder;
    private readonly ChatToolExecutor _toolExecutor;
    private readonly ILogger<ChatController> _logger;

    private static readonly Regex ActionTagRegex =
        new(@"\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]", RegexOptions.Compiled);
    private static readonly Regex HtmlTagRegex = new(@"<[^>]+>", RegexOptions.Compiled);

    public ChatController(
        IChatSessionRepository sessions,
        IChatMessageRepository messages,
        ICheckpointRepository checkpoints,
        IChatProvider provider,
        ChatPromptBuilder promptBuilder,
        ChatToolExecutor toolExecutor,
        ILogger<ChatController> logger)
    {
        _sessions = sessions;
        _messages = messages;
        _checkpoints = checkpoints;
        _provider = provider;
        _promptBuilder = promptBuilder;
        _toolExecutor = toolExecutor;
        _logger = logger;
    }

    [HttpPost("chat/message")]
    public async Task<IActionResult> SendMessage(
        [FromBody] SendChatMessageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ValidationException("Message cannot be empty");

        var language = string.IsNullOrWhiteSpace(request.Language) ? "vi" : request.Language;

        // 1. Get or create session
        ChatSession session;
        if (request.SessionId.HasValue)
        {
            session = await _sessions.GetByIdAsync(request.SessionId.Value, ct)
                      ?? ChatSession.Create(CurrentTraveler.Id, request.CurrentCheckpointId);
        }
        else
        {
            session = ChatSession.Create(CurrentTraveler.Id, request.CurrentCheckpointId);
            await _sessions.CreateAsync(session, ct);
        }

        // 2. Build context
        var ctx = new ChatPromptContext(
            UserMessage: request.Message,
            Language: language,
            GpsLat: request.GpsLat,
            GpsLon: request.GpsLon,
            CurrentCheckpointId: request.CurrentCheckpointId
        );

        // 3. Build system prompt (retrieves KB, formats sections)
        var systemPrompt = await _promptBuilder.BuildSystemPromptAsync(ctx, ct);

        // 4. Build conversation history (last 10 messages)
        var history = await _messages.GetBySessionIdAsync(session.Id, ct);
        var messages = new List<(string Role, string Content)>();
        foreach (var msg in history.TakeLast(10))
        {
            var role = msg.Role switch
            {
                MessageRole.User => "user",
                MessageRole.Assistant => "assistant",
                _ => "system"
            };
            messages.Add((role, msg.Content));
        }
        messages.Add(("user", request.Message));

        // 5. First LLM call (with tools if provider supports it)
        var supportsTools = _provider.SupportsToolCalling;
        var firstResp = await _provider.CompleteAsync(new ChatCompletionRequest(
            SystemPrompt: systemPrompt,
            Messages: messages,
            Tools: supportsTools ? ToolDefinitions.All : null,
            Model: "",
            MaxTokens: 800,
            Temperature: 0.7
        ), ct);

        // 6. Execute tool calls if any
        var invokedTools = new List<string>();
        var kbTopics = new List<string>();
        string finalContent;
        if (firstResp.ToolCalls.Count > 0 && supportsTools)
        {
            foreach (var call in firstResp.ToolCalls)
            {
                invokedTools.Add(call.Name);
                var result = await _toolExecutor.ExecuteAsync(call.Name, call.ArgumentsJson, language, ct);
                messages.Add(("tool", JsonSerializer.Serialize(result)));
            }

            // 7. Second LLM call with tool results
            var secondResp = await _provider.CompleteAsync(new ChatCompletionRequest(
                SystemPrompt: systemPrompt,
                Messages: messages,
                Tools: null,
                Model: "",
                MaxTokens: 800,
                Temperature: 0.7
            ), ct);
            finalContent = secondResp.Content;
        }
        else
        {
            finalContent = firstResp.Content;
        }

        // 8. Sanitize + parse tags
        finalContent = StripHtmlTags(finalContent);
        var tags = ActionTagRegex.Matches(finalContent)
            .Select(m => m.Groups[1].Value).Distinct().ToArray();

        // 9. Save messages
        var userMsg = ChatMessage.Create(session.Id, MessageRole.User, request.Message);
        await _messages.CreateAsync(userMsg, ct);
        var assistantMsg = ChatMessage.Create(session.Id, MessageRole.Assistant, finalContent);
        await _messages.CreateAsync(assistantMsg, ct);

        _logger.LogInformation(
            "Chat: provider={Provider} lang={Lang} tokens={P}/{C} tools={T} latency_ok",
            firstResp.ProviderName, language, firstResp.PromptTokens, firstResp.CompletionTokens,
            string.Join(",", invokedTools));

        return Ok(new
        {
            content = finalContent,
            tags,
            toolCalls = invokedTools,
            sessionId = session.Id
        });
    }

    [HttpGet("chat/sessions/{sessionId:guid}/messages")]
    public async Task<IActionResult> GetSessionMessages(Guid sessionId, CancellationToken ct)
    {
        var messages = await _messages.GetBySessionIdAsync(sessionId, ct);
        return Ok(new
        {
            sessionId,
            messages = messages.Select(m => new
            {
                id = m.Id,
                role = m.Role.ToString().ToLower(),
                content = m.Content,
                createdAt = m.CreatedAt
            })
        });
    }

    private static string StripHtmlTags(string text)
        => HtmlTagRegex.Replace(text ?? "", "");
}
```

- [ ] **Step 2: Update SendChatMessageRequest DTO**

Find `SendChatMessageRequest` (likely in `backend/Application/DTOs/Chat/`). Add fields:

```csharp
public class SendChatMessageRequest
{
    public string Message { get; set; } = string.Empty;
    public Guid? SessionId { get; set; }
    public Guid? CurrentCheckpointId { get; set; }
    public string? Language { get; set; }      // NEW: "vi" | "en"
    public double? GpsLat { get; set; }         // NEW
    public double? GpsLon { get; set; }         // NEW
}
```

- [ ] **Step 3: Register new services in Program.cs**

In `Program.cs`, after the existing external service registrations, add:

```csharp
// ── Hanoi AI Guide services ──
builder.Services.AddScoped<IHanoiKnowledgeService, HanoiKnowledgeService>();
builder.Services.AddScoped<ChatPromptBuilder>();
builder.Services.AddScoped<ChatToolExecutor>();
```

- [ ] **Step 4: Build**

```bash
cd backend && dotnet build --no-restore 2>&1 | tail -15
```

Expected: Build succeeds. If errors about missing interfaces/methods, fix them (likely repository interfaces).

- [ ] **Step 5: Run API + smoke test**

```bash
cd D:/Project/ViTale && docker compose restart api 2>&1 | tail -3
sleep 10
curl -s -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@vitale.vn","password":"DevPass123!"}' | head -c 100
echo ""
```

Login should still work.

- [ ] **Step 6: Test chat endpoint**

```bash
JWT=$(curl -s -X POST http://localhost:5000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"dev@vitale.vn","password":"DevPass123!"}' | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token))")
TRAVELER_ID=$(docker exec vitale_db psql -U postgres -d vitale_db -t -A -c "SELECT id FROM travelers WHERE linked_account_id IS NOT NULL LIMIT 1;")
curl -s -X POST http://localhost:5000/api/v1/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT" \
  -H "X-Traveler-Id: $TRAVELER_ID" \
  -d '{"message":"Hồ Gươm có gì hay?","language":"vi"}' | head -c 500
```

Expected: JSON with `content`, `tags`, `sessionId`.

- [ ] **Step 7: Commit**

```bash
git add backend/WebApi/Controllers/ChatController.cs backend/Application/DTOs/Chat/SendChatMessageRequest.cs backend/WebApi/Program.cs
git commit -m "feat: integrate ChatPromptBuilder + ChatToolExecutor + provider chain in ChatController"
```

---

