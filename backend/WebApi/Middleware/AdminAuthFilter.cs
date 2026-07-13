using Application.Interfaces.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace WebApi.Middleware;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequireAdminJwtAttribute : ActionFilterAttribute
{
    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ActionDescriptor.EndpointMetadata.OfType<Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute>().Any())
        {
            base.OnActionExecuting(context);
            return;
        }

        var authService = context.HttpContext.RequestServices.GetRequiredService<IAuthenticationService>();
        
        var authHeader = context.HttpContext.Request.Headers["Authorization"].FirstOrDefault();
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Missing or invalid Authorization header." });
            return;
        }

        var token = authHeader["Bearer ".Length..].Trim();
        var result = authService.ValidateJwt(token);

        if (result == null || result.Role != "Admin")
        {
            context.Result = new UnauthorizedObjectResult(new { message = "Unauthorized Admin." });
            return;
        }
        
        base.OnActionExecuting(context);
    }
}
