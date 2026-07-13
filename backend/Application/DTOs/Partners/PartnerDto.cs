namespace Application.DTOs;

public record PartnerDto(
    Guid PartnerId,
    string Name,
    string Type,
    string? Address,
    decimal? Latitude,
    decimal? Longitude,
    double? DistanceMeters,
    int AvailableVouchers,
    int PriorityScore);