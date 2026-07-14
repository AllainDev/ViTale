using System.Security.Cryptography;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Entities;

namespace WebApi.Middleware;

/// <summary>
/// Anonymous Identity Middleware:
/// - On first request (no vitale_session cookie): generates a 12-char Anonymous ID,
///   creates a Traveler record, and sets the HTTP-Only cookie.
/// - On subsequent requests: validates the cookie, loads the Traveler, and attaches
///   it to HttpContext.Items["CurrentTraveler"].
/// - If cookie is invalid/tampered: generates a new anonymous identity.
///
/// Performance target: < 5ms per request (uses indexed DB lookup by AnonymousId).
/// </summary>
public class AnonymousIdentityMiddleware
{
    private const string CookieName = "vitale_session";

    private readonly RequestDelegate _next;
    private readonly ILogger<AnonymousIdentityMiddleware> _logger;

    public AnonymousIdentityMiddleware(RequestDelegate next, ILogger<AnonymousIdentityMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ITravelerRepository travelerRepo, ISecureRandomService random)
    {
        // Skip for specific infrastructure paths
        var path = context.Request.Path.Value ?? "";
        if (path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // OWASP A01: If the request carries a valid JWT, defer to BaseController to resolve
        // the traveler from the signed `tid` claim. We DO NOT trust `X-Traveler-Id`
        // from the client — allowing that would let any caller impersonate any
        // traveler by setting an arbitrary header.
        var hasJwt = context.Request.Headers.ContainsKey("Authorization")
            && context.Request.Headers["Authorization"].ToString().StartsWith("Bearer ", StringComparison.Ordinal);

        Traveler? traveler = null;

        // Fallback to cookie (only used when no JWT is present)
        if (!hasJwt && context.Request.Cookies.TryGetValue(CookieName, out var cookieValue)
            && !string.IsNullOrWhiteSpace(cookieValue))
        {
            if (Guid.TryParse(cookieValue, out var travelerId))
            {
                traveler = await travelerRepo.GetByIdAsync(travelerId, context.RequestAborted);
            }

            if (traveler is null || !traveler.IsAnonymous)
            {
                _logger.LogWarning("Invalid or non-anonymous vitale_session cookie value, issuing new identity");
                traveler = null;
            }
        }

        if (traveler is null && !hasJwt)
        {
            // New visitor — create anonymous traveler
            var anonymousId = random.GenerateAnonymousId();
            traveler = Traveler.CreateAnonymous(anonymousId);
            await travelerRepo.CreateAsync(traveler, context.RequestAborted);

            _logger.LogInformation("New anonymous traveler created: {TravelerId}", traveler.Id);
        }

        if (traveler != null)
        {
            // Attach traveler to context for controllers
            context.Items["CurrentTraveler"] = traveler;

            // Refresh / set the cookie (reset TTL on each request)
            var cookieDomain = Environment.GetEnvironmentVariable("COOKIE_DOMAIN") ?? "localhost";
            var isSecure = !cookieDomain.Contains("localhost", StringComparison.OrdinalIgnoreCase);

            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = isSecure,
                SameSite = SameSiteMode.Lax,
                MaxAge = TimeSpan.FromDays(30),
                Path = "/"
            };

            if (!cookieDomain.Equals("localhost", StringComparison.OrdinalIgnoreCase))
            {
                cookieOptions.Domain = cookieDomain;
            }

            context.Response.Cookies.Append(CookieName, traveler.Id.ToString(), cookieOptions);
        }

        await _next(context);
    }
}

