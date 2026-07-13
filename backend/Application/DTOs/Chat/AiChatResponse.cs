namespace Application.DTOs;

public record AiChatResponse(
    string Text,
    string[] ActionTags);
