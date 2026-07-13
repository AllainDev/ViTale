namespace Application.DTOs;

public record CreateCharacterRequest(
    string Name,
    string Region,
    string ModelUrl,
    string? Description);