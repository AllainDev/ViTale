using Domain.Common;

namespace Domain.Entities;

/// <summary>
/// Curated Hà Nội knowledge base entries used for RAG-lite retrieval
/// (Postgres full-text search) so the AI guide has grounded facts instead
/// of relying on the LLM's general knowledge.
/// </summary>
public class HanoiKnowledge
{
    public Guid Id { get; private set; }
    public string Category { get; private set; } = string.Empty;
    public string Topic { get; private set; } = string.Empty;
    public string Question { get; private set; } = string.Empty;
    public string Answer { get; private set; } = string.Empty;
    public string? Keywords { get; private set; }
    public string Language { get; private set; } = string.Empty;
    public string? Source { get; private set; }
    public bool IsActive { get; private set; }
    public DateTime CreatedAt { get; private set; }

    protected HanoiKnowledge() { }

    public static HanoiKnowledge Create(
        string category, string topic, string question, string answer,
        string language, string? keywords = null, string? source = null)
    {
        if (language != "vi" && language != "en")
            throw new ArgumentException("Language must be 'vi' or 'en'", nameof(language));
        if (string.IsNullOrWhiteSpace(question))
            throw new ArgumentException("Question required", nameof(question));
        if (string.IsNullOrWhiteSpace(answer))
            throw new ArgumentException("Answer required", nameof(answer));

        return new HanoiKnowledge
        {
            Id = Guid.NewGuid(),
            Category = category.Trim().ToLowerInvariant(),
            Topic = topic.Trim(),
            Question = question.Trim(),
            Answer = answer.Trim(),
            Keywords = keywords?.Trim(),
            Language = language,
            Source = source?.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Deactivate() => IsActive = false;
}
