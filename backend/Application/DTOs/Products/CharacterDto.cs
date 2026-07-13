namespace Application.DTOs;

public record CharacterDto(
    Guid Id,
    string Name,
    string Region,
    string ModelUrl,
    Dictionary<string, string> AnimationClips);