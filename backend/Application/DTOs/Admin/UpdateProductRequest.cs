namespace Application.DTOs;

public record UpdateProductRequest(
    string Name,
    string Region,
    string? Sku,
    string? Description,
    string? Material,
    string? Price,
    string? ImageUrl,
    bool IsHighlight);
