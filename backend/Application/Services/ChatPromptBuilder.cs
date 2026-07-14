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