using Domain.Enums;

namespace Domain.Entities;

public class ChatSession
{
    public Guid Id { get; private set; }
    public Guid TravelerId { get; private set; }
    public DateTime StartedAt { get; private set; }
    public DateTime LastMessageAt { get; private set; }
    public int TurnCount { get; private set; }
    public string? CondensedContext { get; private set; }
    public Guid? CurrentCheckpointId { get; private set; }

    public ICollection<ChatMessage> Messages { get; private set; } = [];

    protected ChatSession() { }

    public static ChatSession Create(Guid travelerId, Guid? currentCheckpointId = null)
    {
        return new ChatSession
        {
            Id = Guid.NewGuid(),
            TravelerId = travelerId,
            StartedAt = DateTime.UtcNow,
            LastMessageAt = DateTime.UtcNow,
            TurnCount = 0,
            CondensedContext = null,
            CurrentCheckpointId = currentCheckpointId
        };
    }

    public void IncrementTurnCount()
    {
        TurnCount++;
        LastMessageAt = DateTime.UtcNow;
    }

    public void UpdateCondensedContext(string summary)
    {
        CondensedContext = summary;
    }
}

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

