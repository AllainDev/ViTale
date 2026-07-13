namespace Application.DTOs;

public record SendChatMessageRequest(
    Guid? SessionId,
    string? Message,
    Guid? CurrentCheckpointId,
    string LanguageCode = "en");