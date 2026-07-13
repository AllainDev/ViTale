namespace Application.DTOs;

public record ProcessCheckinBatchRequest(IReadOnlyList<CheckinItem> Checkins);