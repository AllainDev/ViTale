namespace Application.DTOs;

public record HealthResponse(string Status, DateTime Timestamp, string? Database, string Version);