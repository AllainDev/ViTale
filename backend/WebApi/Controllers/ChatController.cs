using Microsoft.AspNetCore.Mvc;
using Application.DTOs;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using WebApi.Middleware;

namespace WebApi.Controllers;

public class ChatController : BaseController
{
    private readonly IChatSessionRepository _sessions;
    private readonly IChatMessageRepository _messages;
    private readonly ICheckpointRepository _checkpoints;
    private readonly IAiChatService _ai;
    private readonly ITextToSpeechService _tts;
    private readonly ILogger<ChatController> _logger;

    private const string VietnamGuideSystemPrompt = """
        You are a knowledgeable and enthusiastic Vietnamese cultural guide named Mai.
        You speak in a warm, engaging way and share fascinating stories about Vietnamese history,
        culture, food, and traditions. When asked about specific locations, provide rich context
        about their historical significance. Use action tags like [WAVE], [SMILE], [NOD], [POINT],
        [BOW] to indicate emotions and gestures. Keep responses concise (under 200 words).
        Always respond in the same language the user writes in (Vietnamese or English).
        """;

    public ChatController(
        IChatSessionRepository sessions,
        IChatMessageRepository messages,
        ICheckpointRepository checkpoints,
        IAiChatService ai,
        ITextToSpeechService tts,
        ILogger<ChatController> logger)
    {
        _sessions = sessions;
        _messages = messages;
        _checkpoints = checkpoints;
        _ai = ai;
        _tts = tts;
        _logger = logger;
    }

    /// <summary>POST /api/v1/chat/message</summary>
    [HttpPost("chat/message")]
    public async Task<IActionResult> SendMessage([FromBody] SendChatMessageRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ValidationException("Message cannot be empty");

        // Get or create session
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

        // Build message history for context
        var history = await _messages.GetBySessionIdAsync(session.Id, ct);
        var contextMessages = new List<(string Role, string Content)>();

        // Include condensed context if available (conversation summary)
        if (!string.IsNullOrEmpty(session.CondensedContext))
            contextMessages.Add(("system", $"Previous conversation summary: {session.CondensedContext}"));

        // Include last 10 messages for context
        foreach (var msg in history.TakeLast(10))
        {
            var role = msg.Role switch
            {
                MessageRole.User => "user",
                MessageRole.Assistant => "assistant",
                _ => "system"
            };
            contextMessages.Add((role, msg.Content));
        }

        // Add checkpoint context if provided
        var systemPrompt = VietnamGuideSystemPrompt;
        if (request.CurrentCheckpointId.HasValue)
        {
            var checkpoint = await _checkpoints.GetByIdAsync(request.CurrentCheckpointId.Value, ct);
            if (checkpoint != null)
                systemPrompt += $"\n\nThe user is currently at: {checkpoint.Name}. Provide context specific to this location.";
        }

        // Add current user message
        contextMessages.Add(("user", request.Message));

        // Save user message
        var userMsg = ChatMessage.Create(session.Id, MessageRole.User, request.Message);
        await _messages.CreateAsync(userMsg, ct);

        // Call AI
        AiChatResponse aiResponse;
        try
        {
            aiResponse = await _ai.SendMessageAsync(new AiChatRequest(systemPrompt, contextMessages, 300), ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "AI service error for session {SessionId}", session.Id);
            throw new AiServiceException("AI service temporarily unavailable");
        }

        // Generate TTS audio
        var audioUrl = await _tts.GenerateAudioAsync(
            aiResponse.Text,
            request.LanguageCode,
            session.Id.ToString(),
            ct);

        // Save assistant message
        var assistantMsg = ChatMessage.Create(
            session.Id,
            MessageRole.Assistant,
            aiResponse.Text,
            audioUrl,
            aiResponse.ActionTags);
        await _messages.CreateAsync(assistantMsg, ct);

        // Update session
        session.IncrementTurnCount();
        await _sessions.UpdateAsync(session, ct);

        // Trigger summarization every 20 turns (fire and forget)
        if (session.TurnCount % 20 == 0 && session.TurnCount > 0)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    var fullHistory = string.Join("\n", history.Select(m => $"{m.Role}: {m.Content}"));
                    var summary = await _ai.SummarizeConversationAsync(fullHistory, CancellationToken.None);
                    if (summary != null)
                    {
                        session.UpdateCondensedContext(summary);
                        await _sessions.UpdateAsync(session, CancellationToken.None);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Summarization failed for session {SessionId}", session.Id);
                }
            }, CancellationToken.None);
        }

        return Ok(new SendChatMessageResponse(
            aiResponse.Text,
            audioUrl,
            aiResponse.ActionTags,
            session.Id));
    }
}

