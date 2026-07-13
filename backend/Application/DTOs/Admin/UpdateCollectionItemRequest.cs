namespace Application.DTOs;

public record UpdateCollectionItemRequest(
    string Name,
    string Region,
    string Description,
    string Material,
    string Price,
    string ImageUrl,
    bool IsHighlight);