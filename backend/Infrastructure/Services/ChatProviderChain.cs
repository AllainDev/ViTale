using Application.Interfaces.Services;
using Domain.Exceptions;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services;

/// <summary>
/// Composes multiple IChatProvider instances into a failover chain.
/// Tries providers in priority order (0 = primary). On retryable errors
/// (network timeout), falls back to the next provider. Wraps all failures
/// into AiServiceException so ExceptionHandlingMiddleware returns 503.
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
                    _logger.LogInformation("Provider {Name} succeeded after {N} fallbacks", provider.Name, errors.Count);
                return result;
            }
            catch (Exception ex) when (IsRetryable(ex))
            {
                _logger.LogWarning(ex, "Provider {Name} failed (retryable), trying next provider.", provider.Name);
                errors.Add(ex);
            }
            catch (Exception ex)
            {
                // Non-retryable (e.g. bad request, auth error) — log and stop immediately
                _logger.LogError(ex, "Provider {Name} failed with non-retryable error.", provider.Name);
                throw new AiServiceException($"AI provider '{provider.Name}' error: {ex.Message}");
            }
        }

        // All providers exhausted
        var innerMessages = string.Join("; ", errors.Select(e => e.Message));
        _logger.LogError("All {Count} chat providers failed. Errors: {Errors}", _providers.Count, innerMessages);
        throw new AiServiceException($"All AI providers are currently unavailable. ({innerMessages})");
    }

    /// <summary>
    /// Only true network-level transient errors should trigger fallback.
    /// HTTP 4xx errors (auth, bad request) are NOT retryable.
    /// </summary>
    private static bool IsRetryable(Exception ex)
        => ex is TaskCanceledException
        || (ex is HttpRequestException hre && hre.StatusCode is null); // null = network-level, not HTTP error
}