namespace Application.DTOs;

public class SendChatMessageRequest
{
    public string Message { get; set; } = string.Empty;
    public Guid? SessionId { get; set; }
    public Guid? CurrentCheckpointId { get; set; }
    public string? Language { get; set; }      // "vi" | "en"
    public double? GpsLat { get; set; }
    public double? GpsLon { get; set; }
}