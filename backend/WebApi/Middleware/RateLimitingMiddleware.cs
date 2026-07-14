using Microsoft.Extensions.Caching.Memory;
using Domain.Entities;

namespace WebApi.Middleware;

/// <summary>
/// In-memory rate limiter using a sliding window algorithm.
/// Keys are either IP addresses (for activation endpoints) or Traveler IDs (for user-specific limits).
/// </summary>
public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IMemoryCache _cache;
    private readonly ILogger<RateLimitingMiddleware> _logger;

    // (Path prefix, IsIpBased, Limit, WindowSeconds)
    private static readonly (string Prefix, bool ByIp, int Limit, int Window)[] Rules =
    [
        ("/api/v1/products/activate",        true,  5,   60),
        ("/api/v1/chat/message",             false, 20,  60),  // anonymous; registered gets 30
        ("/api/v1/checkins",                 false, 10,  60),
        ("/api/v1/vouchers/claim",           false, 5,   60),
        ("/api/v1/auth/link-account",        true,  10,  60),
        ("/api/v1/auth/login",               true,  5,   60),
        ("/api/v1/auth/profile",             false, 300, 60),
        ("/api/v1/auth/logout",              true,  30,  60),
        ("/api/v1/gamification/status",      false, 200, 60),
        ("/api/v1/gamification/checkpoints", false, 200, 60),
        ("/api/v1/admin/login",              true,  5,   60),
    ];

    private const int DefaultLimit = 5000;
    private const int DefaultWindowSeconds = 60;

    public RateLimitingMiddleware(RequestDelegate next, IMemoryCache cache, ILogger<RateLimitingMiddleware> logger)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Find matching rule
        var rule = Rules.FirstOrDefault(r => path.StartsWith(r.Prefix, StringComparison.OrdinalIgnoreCase));
        var isMatch = rule != default;

        int limit, window;
        string key;

        if (isMatch)
        {
            limit = rule.Limit;
            window = rule.Window;

            // For chat endpoint, registered users get a higher limit
            if (path.StartsWith("/api/v1/chat/message", StringComparison.OrdinalIgnoreCase))
            {
                var traveler = context.Items["CurrentTraveler"] as Traveler;
                if (traveler?.IsRegistered == true)
                    limit = 30;
            }

            if (rule.ByIp)
            {
                key = $"rl:ip:{GetClientIp(context)}:{rule.Prefix}";
            }
            else
            {
                var traveler = context.Items["CurrentTraveler"] as Traveler;
                if (traveler == null)
                {
                    await _next(context);
                    return;
                }
                key = $"rl:traveler:{traveler.Id}:{rule.Prefix}";
            }
        }
        else
        {
            limit = DefaultLimit;
            window = DefaultWindowSeconds;
            key = $"rl:ip:{GetClientIp(context)}:default";
        }

        var cacheEntry = _cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(window);
            return new { Count = 0, Expires = DateTimeOffset.UtcNow.AddSeconds(window) };
        });

        int count = cacheEntry.Count + 1;
        _cache.Set(key, new { Count = count, Expires = cacheEntry.Expires }, cacheEntry.Expires);

        if (count > limit)
        {
            _logger.LogWarning("Rate limit exceeded for key={Key} count={Count} limit={Limit}", key, count, limit);
            context.Response.Headers["Retry-After"] = window.ToString();
            context.Response.StatusCode = 429;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new
            {
                error = $"Rate limit exceeded, please try again in {window} seconds",
                errorCode = "RATE_LIMIT_EXCEEDED",
                retryAfterSeconds = window
            });
            return;
        }

        await _next(context);
    }

    private static string GetClientIp(HttpContext context)
    {
        // Check X-Forwarded-For (behind Cloudflare/Nginx proxy)
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }
}

