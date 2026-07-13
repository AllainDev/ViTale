namespace Application.DTOs;

public record StampDto(Guid StampId, Guid CheckpointId, string CheckpointName, string ImageUrl, DateTime EarnedAt);