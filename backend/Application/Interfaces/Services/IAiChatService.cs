namespace Application.Interfaces.Services;

using Application.DTOs;

public interface IAiChatService
{
    Task<AiChatResponse> SendMessageAsync(AiChatRequest request, CancellationToken ct = default);
    Task<string?> SummarizeConversationAsync(string conversationHistory, CancellationToken ct = default);
}
