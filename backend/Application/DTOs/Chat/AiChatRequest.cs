using System.Collections.Generic;

namespace Application.DTOs;

public record AiChatRequest(
    string SystemPrompt,
    IReadOnlyList<(string Role, string Content)> Messages,
    int MaxTokens = 300);
