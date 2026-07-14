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