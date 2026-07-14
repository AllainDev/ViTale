using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.Providers;

/// <summary>
/// Groq Cloud LLM provider (OpenAI-compatible API).
/// One provider = one API key. Multiple GroqChatProvider instances rotate via ChatProviderChain.
/// </summary>
public class GroqChatProvider : IChatProvider
{
    public static readonly Regex ActionTagRegex = new(@"\[([A-Z_]+)\]", RegexOptions.Compiled);

    private readonly HttpClient _http;
    private readonly ILogger<GroqChatProvider> _logger;
    private readonly string _name;
    private readonly string _model;

    public string Name => _name;
    public int Priority { get; }
    public bool SupportsToolCalling => true;

    public GroqChatProvider(
        IHttpClientFactory factory, ILogger<GroqChatProvider> logger,
        string name, string apiKey, string baseUrl, string model, int priority)
    {
        _http = factory.CreateClient("GroqProvider_" + name);
        if (_http.BaseAddress == null)
            _http.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
        _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        _http.Timeout = TimeSpan.FromSeconds(30);
        _logger = logger;
        _name = name;
        _model = model;
        Priority = priority;
    }

    public async Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest req, CancellationToken ct = default)
    {
        var messages = new List<object>
        {
            new { role = "system", content = req.SystemPrompt }
        };
        foreach (var (role, content) in req.Messages)
        {
            var safeContent = role == "user" ? $"\"\"\"{content.Replace("\"", "'")}\"\"\"" : content;
            messages.Add(new { role, content = safeContent });
        }

        object body;
        if (req.Tools != null && req.Tools.Count > 0)
        {
            body = new
            {
                model = _model,
                messages,
                temperature = req.Temperature,
                max_tokens = req.MaxTokens,
                tools = req.Tools.Select(t => new
                {
                    type = "function",
                    function = new
                    {
                        name = t.Name,
                        description = t.Description,
                        parameters = t.Parameters
                    }
                }).ToArray(),
                tool_choice = "auto"
            };
        }
        else
        {
            body = new
            {
                model = _model,
                messages,
                temperature = req.Temperature,
                max_tokens = req.MaxTokens
            };
        }

        var json = JsonSerializer.Serialize(body);
        var response = await _http.PostAsync("chat/completions",
            new StringContent(json, Encoding.UTF8, "application/json"), ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GroqResponse>(ct)
            ?? throw new InvalidOperationException("Empty Groq response");
        var choice = result.choices.First();
        var text = choice.message?.content ?? "";
        var toolCalls = ParseToolCalls(choice.message?.tool_calls);

        return new ChatCompletionResult(
            Content: text,
            ToolCalls: toolCalls,
            ProviderName: _name,
            PromptTokens: result.usage?.prompt_tokens ?? 0,
            CompletionTokens: result.usage?.completion_tokens ?? 0
        );
    }

    private static IReadOnlyList<ToolCall> ParseToolCalls(JsonElement[]? calls)
    {
        if (calls == null || calls.Length == 0) return Array.Empty<ToolCall>();
        return calls.Select(c => new ToolCall(
            Name: c.GetProperty("function").GetProperty("name").GetString() ?? "",
            ArgumentsJson: c.GetProperty("function").GetProperty("arguments").GetString() ?? "{}"
        )).ToList();
    }

    // Internal response DTOs
    private class GroqResponse
    {
        public List<GroqChoice> choices { get; set; } = new();
        public GroqUsage? usage { get; set; }
    }
    private class GroqChoice
    {
        public GroqMessage? message { get; set; }
    }
    private class GroqMessage
    {
        public string? content { get; set; }
        public JsonElement[]? tool_calls { get; set; }
    }
    private class GroqUsage
    {
        public int prompt_tokens { get; set; }
        public int completion_tokens { get; set; }
    }
}
