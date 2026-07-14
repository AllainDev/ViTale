namespace Application.DTOs;

public record UpdateRegionRequest(
    string? Name,
    string? Slug,
    string? Description,
    int? SortOrder,
    bool? IsActive
);
