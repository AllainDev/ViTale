namespace Application.DTOs;

public record CreateRegionRequest(
    string Name,
    string Slug,
    string? Description,
    int SortOrder = 0
);
