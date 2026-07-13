namespace Application.DTOs;

public record SendChatMessageResponse(
    string Text,
    string? AudioUrl,
    string[] ActionTags,
    Guid SessionId);