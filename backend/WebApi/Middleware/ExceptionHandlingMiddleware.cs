using System.Diagnostics;
using System.Net;
using System.Text.Json;

namespace WebApi.Middleware;

/// <summary>
/// Global exception handler — catches all unhandled exceptions and returns
/// structured JSON responses. Never leaks internal details to the client.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            await WriteErrorAsync(context, 400, "VALIDATION_ERROR", ex.Message);
        }
        catch (NotFoundException ex)
        {
            await WriteErrorAsync(context, 404, "NOT_FOUND", ex.Message);
        }
        catch (ConflictException ex)
        {
            await WriteErrorAsync(context, 409, "CONFLICT", ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            await WriteErrorAsync(context, 401, "UNAUTHORIZED", ex.Message);
        }
        catch (RateLimitExceededException ex)
        {
            context.Response.Headers["Retry-After"] = ex.RetryAfterSeconds.ToString();
            await WriteErrorAsync(context, 429, "RATE_LIMIT_EXCEEDED",
                $"Rate limit exceeded, please try again in {ex.RetryAfterSeconds} seconds");
        }
        catch (AiServiceException ex)
        {
            _logger.LogError(ex, "AI service error on {Method} {Path}",
                context.Request.Method, context.Request.Path);
            await WriteErrorAsync(context, 503, "AI_SERVICE_UNAVAILABLE",
                "AI service temporarily unavailable");
        }
        catch (Exception ex)
        {
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            _logger.LogError(ex,
                "Unhandled exception for {Method} {Path} | TraceId={TraceId}",
                context.Request.Method, context.Request.Path, traceId);

            await WriteErrorAsync(context, 500, "INTERNAL_ERROR",
                "An unexpected error occurred. Please try again later.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext ctx, int status, string code, string message)
    {
        if (ctx.Response.HasStarted) return;

        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/json";

        var body = new
        {
            error = message,
            errorCode = code,
            timestamp = DateTime.UtcNow.ToString("o"),
            traceId = Activity.Current?.Id ?? ctx.TraceIdentifier
        };

        await ctx.Response.WriteAsJsonAsync(body);
    }
}

// ── Domain Exception Types ─────────────────────────────────────────────────
public class ValidationException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ConflictException(string message) : Exception(message);
public class UnauthorizedException(string message) : Exception(message);
public class AiServiceException(string message) : Exception(message);

public class RateLimitExceededException(int retryAfterSeconds)
    : Exception($"Rate limit exceeded, retry in {retryAfterSeconds}s")
{
    public int RetryAfterSeconds { get; } = retryAfterSeconds;
}

