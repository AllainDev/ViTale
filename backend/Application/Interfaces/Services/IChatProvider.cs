using Application.DTOs;

namespace Application.Interfaces.Services;

/// <summary>
/// One LLM chat provider (Groq, MiniMax, etc.). Implementations are
/// composed into a ChatProviderChain that handles failover.
/// </summary>
public interface IChatProvider
{
    string Name { get; }
    int Priority { get; }
    bool SupportsToolCalling { get; }

    Task<ChatCompletionResult> CompleteAsync(
        ChatCompletionRequest request, CancellationToken ct = default);
}

public record ChatCompletionRequest(
    string SystemPrompt,
    IReadOnlyList<(string Role, string Content)> Messages,
    IReadOnlyList<ToolDefinition>? Tools,
    string Model,
    int MaxTokens,
    double Temperature
);

public record ChatCompletionResult(
    string Content,
    IReadOnlyList<ToolCall> ToolCalls,
    string ProviderName,
    int PromptTokens,
    int CompletionTokens
);

public record ToolCall(string Name, string ArgumentsJson);

public record ToolDefinition(
    string Name,
    string Description,
    object Parameters
);