namespace Application.DTOs;

public record CreateProductRequest(
    string Name,
    string Region,
    string ProductType,
    string? Sku,
    string? Description,
    string? Material,
    string? Price,
    string? ImageUrl,
    bool IsHighlight);
