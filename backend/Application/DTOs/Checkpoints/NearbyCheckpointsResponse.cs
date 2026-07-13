namespace Application.DTOs;

public record NearbyCheckpointsResponse(IReadOnlyList<NearbyCheckpointDto> Checkpoints);