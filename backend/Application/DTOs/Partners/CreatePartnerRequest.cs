namespace Application.DTOs;

public record CreatePartnerRequest(
    string Name,
    string Type,
    string? ContactEmail,
    string? PhoneNumber,
    string? Address,
    decimal? Latitude,
    decimal? Longitude,
    int PriorityScore = 50);