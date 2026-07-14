using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.DependencyInjection;
using Domain.Entities;

namespace WebApi.Controllers;

[ApiController]
[Route("api/v1")]
public abstract class BaseController : ControllerBase
{
    protected Traveler CurrentTraveler 
    {
        get
        {
            var logger = HttpContext.RequestServices.GetService<ILogger<BaseController>>();
            
            var travelerIdClaim = HttpContext.User.Claims.FirstOrDefault(c => c.Type == "tid" || c.Type == "http://schemas.microsoft.com/identity/claims/tenantid")?.Value;
            if (Guid.TryParse(travelerIdClaim, out var travelerId))
            {
                logger?.LogWarning("BaseController found valid tid claim: {Tid}", travelerId);
                var repo = HttpContext.RequestServices.GetRequiredService<Application.Interfaces.Repositories.ITravelerRepository>();
                var traveler = repo.GetByIdAsync(travelerId).GetAwaiter().GetResult();
                if (traveler != null)
                {
                    logger?.LogWarning("BaseController returning JWT Traveler: {Id}, Linked: {Linked}", traveler.Id, traveler.LinkedAccountId);
                    return traveler;
                }
                logger?.LogWarning("BaseController could not find Traveler with tid {Tid} in database!", travelerId);
            }
            else
            {
                logger?.LogWarning("BaseController could not find tid claim. All claims: {Claims}", string.Join(", ", HttpContext.User.Claims.Select(c => $"{c.Type}={c.Value}")));
            }

            logger?.LogWarning("BaseController falling back to Cookie Traveler.");
            return (HttpContext.Items["CurrentTraveler"] as Traveler)
                   ?? throw new WebApi.Middleware.UnauthorizedException("Unauthorized. Please log in.");
        }
    }

    /// <summary>
    /// Async compatibility shim — wraps the synchronous <see cref="CurrentTraveler"/> property.
    /// Prefer <c>CurrentTraveler</c> in new code.
    /// </summary>
    protected Task<Traveler> GetCurrentTravelerAsync() => Task.FromResult(CurrentTraveler);
}
