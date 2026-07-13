namespace Application.DTOs;

public record InvalidCheckinDto(Guid CheckpointId, string Reason);