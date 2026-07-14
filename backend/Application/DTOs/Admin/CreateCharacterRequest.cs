namespace Application.DTOs;

public record CreateCharacterRequest(
    string Name,
    string Region,
    Guid? ProductId,
    string ModelUrl,
    string? Description);
