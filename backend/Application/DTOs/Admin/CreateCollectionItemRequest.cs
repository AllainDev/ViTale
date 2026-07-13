namespace Application.DTOs;

public record CreateCollectionItemRequest(
    string Name,
    string Region,
    string Description,
    string Material,
    string Price,
    string ImageUrl,
    bool IsHighlight);