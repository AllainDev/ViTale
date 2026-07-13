using Domain.Common;

namespace Domain.Events;

public sealed class CheckpointUnlockedEvent : DomainEvent
{
    public Guid CheckpointId { get; }
    public Guid TravelerId { get; }
    public Guid StoryChapterId { get; }
    public CheckpointUnlockedEvent(Guid checkpointId, Guid travelerId, Guid storyChapterId)
    {
        CheckpointId = checkpointId;
        TravelerId = travelerId;
        StoryChapterId = storyChapterId;
    }
}