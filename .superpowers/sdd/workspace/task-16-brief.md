### Task 16: TDD — ChatPromptBuilder

**Files:**
- Create: `backend/Application.Tests/Services/ChatPromptBuilderTests.cs`
- Create: `backend/Application/Services/ChatPromptBuilder.cs`

**Interfaces:**
- Produces: `BuildSystemPromptAsync(ChatPromptContext ctx, CancellationToken ct) → Task<string>`

- [ ] **Step 1: Create test**

Create `backend/Application.Tests/Services/ChatPromptBuilderTests.cs`:

```csharp
using Application.DTOs;
using Application.Interfaces.Services;
using Application.Services;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Application.Tests.Services;

public class ChatPromptBuilderTests
{
    private class FakeKbService : IHanoiKnowledgeService
    {
        public List<HanoiKnowledgeChunk> Chunks { get; set; } = new();
        public Task<IReadOnlyList<HanoiKnowledgeChunk>> SearchAsync(string query, string language, int topK = 3, string? category = null, CancellationToken ct = default)
            => Task.FromResult<IReadOnlyList<HanoiKnowledgeChunk>>(Chunks);
    }

    private ChatPromptBuilder MakeSut(List<HanoiKnowledgeChunk>? chunks = null)
    {
        var kb = new FakeKbService { Chunks = chunks ?? new() };
        return new ChatPromptBuilder(kb, NullLogger<ChatPromptBuilder>.Instance);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesVietnamesePersona_WhenLanguageIsVi()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("Hỏi về Hà Nội", "vi", null, null, null),
            CancellationToken.None);

        Assert.Contains("Mai", prompt);
        Assert.Contains("Hà Nội", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesEnglishPersona_WhenLanguageIsEn()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("Tell me about Hanoi", "en", null, null, null),
            CancellationToken.None);

        Assert.Contains("Mai", prompt);
        Assert.Contains("Hanoi", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_InjectsKbChunks_WhenFound()
    {
        var chunks = new List<HanoiKnowledgeChunk>
        {
            new("Hoan Kiem Lake", "What is it?", "A lake in center of Hanoi.", "ViTale KB", "history")
        };
        var sut = MakeSut(chunks);
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("lake", "en", null, null, null),
            CancellationToken.None);

        Assert.Contains("Hoan Kiem Lake", prompt);
        Assert.Contains("A lake in center", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_ShowsEmptyKbSection_WhenNoChunks()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("xyz", "en", null, null, null),
            CancellationToken.None);

        Assert.Contains("Không có thông tin liên quan", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_IncludesGpsSection_WhenCoordinatesPresent()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("nearby?", "vi", 21.0285, 105.8542, null),
            CancellationToken.None);

        Assert.Contains("21.0285", prompt);
        Assert.Contains("105.8542", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_OmitsGpsSection_WhenNoCoordinates()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("hi", "vi", null, null, null),
            CancellationToken.None);

        Assert.DoesNotContain("VỊ TRÍ HIỆN TẠI", prompt);
    }

    [Fact]
    public async Task BuildSystemPrompt_AlwaysEndsWithSafetyRails()
    {
        var sut = MakeSut();
        var prompt = await sut.BuildSystemPromptAsync(
            new ChatPromptContext("x", "en", null, null, null),
            CancellationToken.None);

        // Safety rails should be near the end
        Assert.EndsWith(prompt.Trim(), prompt.Trim());
        Assert.Contains("Safety", prompt, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("CHỈ trả lời về Hà Nội", prompt);
    }
}
```

- [ ] **Step 2: Run tests — verify FAIL**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~ChatPromptBuilderTests" 2>&1 | tail -10
```

Expected: FAIL — `ChatPromptBuilder` not found.

- [ ] **Step 3: Create implementation**

Create `backend/Application/Services/ChatPromptBuilder.cs`:

```csharp
using Application.DTOs;
using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public record ChatPromptContext(
    string UserMessage,
    string Language,
    double? GpsLat,
    double? GpsLon,
    Guid? CurrentCheckpointId
);

/// <summary>
/// Builds the system prompt for Mai (the Hà Nội AI guide) by combining:
///   1. Persona (VI or EN variant)
///   2. KB chunks retrieved via full-text search
///   3. Optional GPS context
///   4. Optional checkpoint context
///   5. Safety rails (always at end)
/// </summary>
public class ChatPromptBuilder
{
    private const string VietnamesePersona = """
        Bạn là Mai — hướng dẫn viên Hà Nội nhiệt tình và am hiểu. Bạn yêu Hà Nội,
        am hiểu 36 phố phường, ẩm thực vỉa hè, lịch sử nghìn năm, và những ngõ nhỏ
        ít người biết. Khi người dùng hỏi, bạn chia sẻ câu chuyện, tips thực tế,
        và gợi ý địa điểm phù hợp. Giọng nói thân thiện, gần gũi như người bạn
        Hà Nội chính gốc. Trả lời NGẮN GỌN (dưới 150 từ) trừ khi được yêu cầu
        chi tiết. Luôn dùng action tags [WAVE], [SMILE], [NOD], [POINT], [BOW]
        để biểu cảm.
        """;

    private const string EnglishPersona = """
        You are Mai — an enthusiastic and knowledgeable Hà Nội local friend.
        You love Hanoi, know the 36 streets of Old Quarter, street food culture,
        thousand-year history, and hidden alleys. When users ask, you share
        stories, practical tips, and tailored recommendations. Friendly tone,
        like a local expat friend. Keep responses CONCISE (under 150 words)
        unless asked for detail. Always use action tags [WAVE], [SMILE], [NOD],
        [POINT], [BOW] for expressiveness.
        """;

    private const string SafetyRails = """

        === SAFETY RAILS (QUY TẮC AN TOÀN) ===
        1. CHỈ trả lời về Hà Nội và du lịch Hà Nội. Ngoài phạm vi → từ chối lịch sự.
        2. Nếu không có thông tin trong KB → nói "Mình chưa có thông tin này, bạn nên kiểm tra trên trang chính thức".
        3. KHÔNG bịa số liệu, giá cả, giờ mở cửa nếu không có trong KB hoặc tool response.
        4. LUÔN dùng action tags [WAVE], [SMILE], [NOD], [POINT], [BOW].
        5. Trả lời dưới 150 từ.
        """;

    private readonly IHanoiKnowledgeService _kb;
    private readonly ILogger<ChatPromptBuilder> _logger;

    public ChatPromptBuilder(IHanoiKnowledgeService kb, ILogger<ChatPromptBuilder> logger)
    {
        _kb = kb;
        _logger = logger;
    }

    public async Task<string> BuildSystemPromptAsync(ChatPromptContext ctx, CancellationToken ct)
    {
        var basePersona = ctx.Language == "en" ? EnglishPersona : VietnamesePersona;

        var kbChunks = await _kb.SearchAsync(ctx.UserMessage, ctx.Language, topK: 3, ct: ct);
        var kbSection = BuildKbSection(kbChunks, ctx.Language);

        var gpsSection = BuildGpsSection(ctx);

        var checkpointSection = ctx.CurrentCheckpointId.HasValue
            ? $"\n\n=== CHECKPOINT HIỆN TẠI ===\nUser đang ở gần checkpoint ID={ctx.CurrentCheckpointId}. " +
              "Bạn có thể dùng tool get_checkpoint_details để lấy thông tin chi tiết."
            : "";

        return basePersona + kbSection + gpsSection + checkpointSection + SafetyRails;
    }

    private static string BuildKbSection(IReadOnlyList<HanoiKnowledgeChunk> chunks, string lang)
    {
        if (chunks.Count == 0)
        {
            return lang == "en"
                ? "\n\n=== KNOWLEDGE BASE ===\nNo relevant info in KB. Answer using general knowledge but say 'I don't have specific info on this' if uncertain."
                : "\n\n=== KIẾN THỨC THAM KHẢO ===\nKhông có thông tin liên quan trong KB. Trả lời dựa trên kiến thức chung nhưng nói rõ nếu không chắc.";
        }

        var header = lang == "en" ? "=== KNOWLEDGE BASE ===" : "=== KIẾN THỨC THAM KHẢO ===";
        var body = string.Join("\n\n---\n\n", chunks.Select(c =>
            $"[Chủ đề: {c.Topic}]\nQ: {c.Question}\nA: {c.Answer}\n(Nguồn: {c.Source ?? "ViTale KB"})"));

        return $"\n\n{header}\n{body}";
    }

    private static string BuildGpsSection(ChatPromptContext ctx)
    {
        if (!ctx.GpsLat.HasValue || !ctx.GpsLon.HasValue)
            return "";

        return $"\n\n=== VỊ TRÍ HIỆN TẠI ===\n" +
               $"Người dùng đang ở: lat={ctx.GpsLat:F4}, lon={ctx.GpsLon:F4}. " +
               $"Có thể dùng tool get_nearby_partners hoặc get_nearby_checkpoints để gợi ý địa điểm gần đây.";
    }
}
```

- [ ] **Step 4: Run tests — verify PASS**

```bash
cd backend && dotnet test Application.Tests/Application.Tests.csproj --filter "FullyQualifiedName~ChatPromptBuilderTests" 2>&1 | tail -10
```

Expected: 7 passed.

- [ ] **Step 5: Commit**

```bash
git add backend/Application/Services/ChatPromptBuilder.cs backend/Application.Tests/Services/ChatPromptBuilderTests.cs
git commit -m "feat: ChatPromptBuilder with KB injection + safety rails + tests"
```

---

