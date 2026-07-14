using Domain.Enums;

namespace Domain.Entities;

public class ChatMessage
{
    public Guid Id { get; private set; }
    public Guid SessionId { get; private set; }
    public MessageRole Role { get; private set; }
    public string Content { get; private set; } = string.Empty;
    public string? AudioUrl { get; private set; }
    public string[] ActionTags { get; private set; } = [];
    public DateTime CreatedAt { get; private set; }

    protected ChatMessage() { }

    public static ChatMessage Create(Guid sessionId, MessageRole role, string content, string? audioUrl = null, string[]? actionTags = null)
    {
        return new ChatMessage
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Role = role,
            Content = content,
            AudioUrl = audioUrl,
            ActionTags = actionTags ?? [],
            CreatedAt = DateTime.UtcNow
        };
    }
}
