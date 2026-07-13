namespace Application.DTOs;

public record CheckinItem(
    Guid CheckpointId,
    DateTime CheckinAt,
    Guid ClientGeneratedId,
    decimal Latitude,
    decimal Longitude);