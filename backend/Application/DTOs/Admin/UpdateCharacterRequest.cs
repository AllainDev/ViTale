namespace Application.DTOs;

public record UpdateCharacterRequest(
    string Name,
    string Region,
    string ModelUrl,
    string? Description);