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



