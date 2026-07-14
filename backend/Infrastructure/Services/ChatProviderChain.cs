using Application.Interfaces.Services;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Composes multiple IChatProvider instances into a failover chain.
/// Tries providers in priority order (0 = primary). On retryable errors
/// (HTTP/network), falls back to the next provider. On non-retryable errors
/// (bad arguments), re-throws immediately.
/// </summary>
public class ChatProviderChain : IChatProvider
{
    private readonly IReadOnlyList<IChatProvider> _providers;
    private readonly ILogger<ChatProviderChain> _logger;

    public string Name => _providers.FirstOrDefault()?.Name ?? "empty-chain";
    public int Priority => _providers.FirstOrDefault()?.Priority ?? 0;
    public bool SupportsToolCalling => _providers.Any(p => p.SupportsToolCalling);

    public ChatProviderChain(IReadOnlyList<IChatProvider> providers, ILogger<ChatProviderChain> logger)
    {
        _providers = providers.OrderBy(p => p.Priority).ToList();
        _logger = logger;
    }

    public async Task<ChatCompletionResult> CompleteAsync(ChatCompletionRequest request, CancellationToken ct = default)
    {
        var errors = new List<Exception>();
        foreach (var provider in _providers)
        {
            try
            {
                var result = await provider.CompleteAsync(request, ct);
                if (errors.Count > 0)
                    _logger.LogInformation("Provider {Name} succeeded after {N} retries", provider.Name, errors.Count);
                return result;
            }
            catch (Exception ex) when (IsRetryable(ex))
            {
                _logger.LogWarning("Provider {Name} failed: {Error}. Trying next.", provider.Name, ex.Message);
                errors.Add(ex);
            }
        }
        throw new AggregateException("All chat providers failed", errors);
    }

    private static bool IsRetryable(Exception ex)
        => ex is HttpRequestException
        || ex is TaskCanceledException
        || ex is InvalidOperationException ioe && ioe.Message.Contains("rate", StringComparison.OrdinalIgnoreCase);
}