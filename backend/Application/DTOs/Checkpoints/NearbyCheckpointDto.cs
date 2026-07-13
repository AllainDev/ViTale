namespace Application.DTOs;

public record NearbyCheckpointDto(
    Guid CheckpointId,
    string Name,
    decimal Latitude,
    decimal Longitude,
    double DistanceMeters,
    bool IsVisited,
    string? StoryChapterTitle,
    string Region);