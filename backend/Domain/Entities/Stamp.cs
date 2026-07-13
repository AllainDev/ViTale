namespace Domain.Entities;

public class Stamp
{
    public Guid Id { get; private set; }
    public Guid TravelerId { get; private set; }
    public Guid CheckpointId { get; private set; }
    public string ImageUrl { get; private set; } = string.Empty;
    public DateTime EarnedAt { get; private set; }

    public Checkpoint? Checkpoint { get; private set; }

    protected Stamp() { }

    public static Stamp Create(Guid travelerId, Guid checkpointId, string imageUrl)
    {
        return new Stamp
        {
            Id = Guid.NewGuid(),
            TravelerId = travelerId,
            CheckpointId = checkpointId,
            ImageUrl = imageUrl,
            EarnedAt = DateTime.UtcNow
        };
    } 
}

