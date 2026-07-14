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