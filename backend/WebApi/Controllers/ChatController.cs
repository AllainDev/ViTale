using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.DTOs.Tools;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Application.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Services;
using Infrastructure.Services.Providers;
using WebApi.Middleware;
using ChatMessage = Application.Interfaces.Services.ChatMessage;

namespace WebApi.Controllers;

public class ChatController : BaseController
{
    private readonly IChatSessionRepository _sessions;
    private readonly IChatMessageRepository _messages;
    private readonly ICheckpointRepository _checkpoints;
    private readonly IChatProvider _provider;
    private readonly ChatPromptBuilder _promptBuilder;
    private readonly ChatToolExecutor _toolExecutor;
    private readonly ILogger<ChatController> _logger;

    private static readonly Regex ActionTagRegex =
        new(@"\[(WAVE|SMILE|NOD|POINT|BOW|DANCE)\]", RegexOptions.Compiled);
    private static readonly Regex HtmlTagRegex = new(@"<[^>]+>", RegexOptions.Compiled);

    public ChatController(
        IChatSessionRepository sessions,
        IChatMessageRepository messages,
        ICheckpointRepository checkpoints,
        IChatProvider provider,
        ChatPromptBuilder promptBuilder,
        ChatToolExecutor toolExecutor,
        ILogger<ChatController> logger)
    {
        _sessions = sessions;
        _messages = messages;
        _checkpoints = checkpoints;
        _provider = provider;
        _promptBuilder = promptBuilder;
        _toolExecutor = toolExecutor;
        _logger = logger;
    }

    [HttpPost("chat/message")]
    public async Task<IActionResult> SendMessage(
        [FromBody] SendChatMessageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ValidationException("Message cannot be empty");

        var language = string.IsNullOrWhiteSpace(request.Language) ? "vi" : request.Language;

        // 1. Get or create session
        ChatSession session;
        if (request.SessionId.HasValue)
        {
            session = await _sessions.GetByIdAsync(request.SessionId.Value, ct)
                      ?? ChatSession.Create(CurrentTraveler.Id, request.CurrentCheckpointId);
        }
        else
        {
            session = ChatSession.Create(CurrentTraveler.Id, request.CurrentCheckpointId);
            await _sessions.CreateAsync(session, ct);
        }

        // 2. Build context
        var ctx = new ChatPromptContext(
            UserMessage: request.Message,
            Language: language,
            GpsLat: request.GpsLat,
            GpsLon: request.GpsLon,
            CurrentCheckpointId: request.CurrentCheckpointId
        );

        // 3. Build system prompt (retrieves KB, formats sections)
        var systemPrompt = await _promptBuilder.BuildSystemPromptAsync(ctx, ct);

        // 4. Build conversation history (last 10 messages)
        var history = await _messages.GetBySessionIdAsync(session.Id, ct);
        var messages = new List<ChatMessage>();
        foreach (var msg in history.TakeLast(10))
        {
            var role = msg.Role switch
            {
                MessageRole.User => "user",
                MessageRole.Assistant => "assistant",
                _ => "system"
            };
            messages.Add(new ChatMessage(role, msg.Content));
        }
        messages.Add(new ChatMessage("user", request.Message));

        // 5. First LLM call (with tools if provider supports it)
        var supportsTools = _provider.SupportsToolCalling;
        var firstResp = await _provider.CompleteAsync(new ChatCompletionRequest(
            SystemPrompt: systemPrompt,
            Messages: messages,
            Tools: supportsTools ? ToolDefinitions.All : null,
            Model: "",
            MaxTokens: 800,
            Temperature: 0.7
        ), ct);

        // 6. Execute tool calls if any
        var invokedTools = new List<string>();
        var kbTopics = new List<string>();
        string finalContent;
        if (firstResp.ToolCalls.Count > 0 && supportsTools)
        {
            foreach (var call in firstResp.ToolCalls)
            {
                invokedTools.Add(call.Name);
                var result = await _toolExecutor.ExecuteAsync(call.Name, call.ArgumentsJson, language, ct);
                messages.Add(new ChatMessage(
                    Role: "tool",
                    Content: JsonSerializer.Serialize(result),
                    ToolCallId: call.Id,
                    ToolName: call.Name
                ));
            }

            // 7. Second LLM call with tool results
            var secondResp = await _provider.CompleteAsync(new ChatCompletionRequest(
                SystemPrompt: systemPrompt,
                Messages: messages,
                Tools: null,
                Model: "",
                MaxTokens: 800,
                Temperature: 0.7
            ), ct);
            finalContent = secondResp.Content;
        }
        else
        {
            finalContent = firstResp.Content;
        }

        // 8. Sanitize + parse tags
        finalContent = StripHtmlTags(finalContent);
        var tags = ActionTagRegex.Matches(finalContent)
            .Select(m => m.Groups[1].Value).Distinct().ToArray();

        // 9. Save messages
        var userMsg = Domain.Entities.ChatMessage.Create(session.Id, MessageRole.User, request.Message);
        await _messages.CreateAsync(userMsg, ct);
        var assistantMsg = Domain.Entities.ChatMessage.Create(session.Id, MessageRole.Assistant, finalContent);
        await _messages.CreateAsync(assistantMsg, ct);

        _logger.LogInformation(
            "Chat: provider={Provider} lang={Lang} tokens={P}/{C} tools={T} latency_ok",
            firstResp.ProviderName, language, firstResp.PromptTokens, firstResp.CompletionTokens,
            string.Join(",", invokedTools));

        return Ok(new
        {
            message = finalContent,
            action = tags.Length > 0 ? string.Join(",", tags) : null,
            audioUrl = (string)null,
            toolCalls = invokedTools,
            sessionId = session.Id
        });
    }

    [HttpGet("chat/sessions/{sessionId:guid}/messages")]
    public async Task<IActionResult> GetSessionMessages(Guid sessionId, CancellationToken ct)
    {
        var messages = await _messages.GetBySessionIdAsync(sessionId, ct);
        return Ok(new
        {
            sessionId,
            messages = messages.Select(m => new
            {
                id = m.Id,
                role = m.Role.ToString().ToLower(),
                content = m.Content,
                createdAt = m.CreatedAt
            })
        });
    }

    private static string StripHtmlTags(string text)
        => HtmlTagRegex.Replace(text ?? "", "");
}