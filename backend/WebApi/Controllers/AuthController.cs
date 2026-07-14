using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Application.DTOs;
using Application.Interfaces.Repositories;
using Application.Interfaces.Services;
using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using WebApi.Middleware;

namespace WebApi.Controllers;

public class AuthController : BaseController
{
    private readonly IPassportAccountRepository _accounts;
    private readonly ITravelerRepository _travelers;
    private readonly Application.Interfaces.Services.IAuthenticationService _auth;
    private readonly IEmailService _emailService;
    private readonly IEmailValidationService _emailValidation;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthController> _logger;
    private readonly ApplicationDbContext _db;

    public AuthController(
        IPassportAccountRepository accounts,
        ITravelerRepository travelers,
        Application.Interfaces.Services.IAuthenticationService auth,
        IEmailService emailService,
        IEmailValidationService emailValidation,
        IConfiguration config,
        ILogger<AuthController> logger,
        ApplicationDbContext db)
    {
        _accounts = accounts;
        _travelers = travelers;
        _auth = auth;
        _emailService = emailService;
        _emailValidation = emailValidation;
        _config = config;
        _logger = logger;
        _db = db;
    }

    /// <summary>GET /api/v1/auth/login/{provider}</summary>
    [HttpGet("auth/login/{provider}")]
    public IActionResult Login(string provider)
    {
        var properties = new Microsoft.AspNetCore.Authentication.AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(Callback))
        };
        return Challenge(properties, provider);
    }

    /// <summary>GET /api/v1/auth/access-denied</summary>
    [HttpGet("auth/access-denied")]
    public IActionResult AccessDenied()
    {
        return Redirect($"{_config["FrontendUrl"] ?? "http://localhost:3000"}/auth/callback?error=access_denied");
    }

    /// <summary>GET /api/v1/auth/callback</summary>
    [HttpGet("auth/callback")]
    public async Task<IActionResult> Callback(CancellationToken ct)
    {
        var result = await HttpContext.AuthenticateAsync(
            Microsoft.AspNetCore.Authentication.Cookies.CookieAuthenticationDefaults.AuthenticationScheme);

        var frontendUrl = _config["FrontendUrl"] ?? "http://localhost:3000";

        if (!result.Succeeded)
            return Redirect($"{frontendUrl}/auth/callback?error=auth_failed");

        var claims = result.Principal.Identities.FirstOrDefault()?.Claims;
        if (claims == null)
            return Redirect($"{frontendUrl}/auth/callback?error=no_claims");

        var oAuthUserId = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var email = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value;
        var name = claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Name)?.Value 
                ?? claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.GivenName)?.Value
                ?? claims.FirstOrDefault(c => c.Type == "name")?.Value
                ?? claims.FirstOrDefault(c => c.Type == "urn:google:name")?.Value;
        
        // ASP.NET Core usually puts provider name in AuthenticationMethod or we can deduce it from the identity auth type
        var providerString = result.Principal.Identity?.AuthenticationType ?? "Google";
        if (!Enum.TryParse<OAuthProvider>(providerString, true, out var provider))
            provider = OAuthProvider.Google;

        if (string.IsNullOrEmpty(oAuthUserId))
            return Redirect($"{frontendUrl}/auth/callback?error=missing_id");

        var account = await _accounts.GetByProviderAsync(provider.ToString(), oAuthUserId, ct);
        var traveler = await GetCurrentTravelerAsync();

        if (account == null)
        {
            if (!string.IsNullOrEmpty(email))
            {
                var existingEmailAccount = await _accounts.GetByEmailAsync(email, ct);
                if (existingEmailAccount != null)
                {
                    bool needsUpdate = false;
                    if (existingEmailAccount.OAuthProvider == null)
                    {
                        // Link existing email/password account to this OAuth provider
                        existingEmailAccount.LinkOAuthProvider(provider, oAuthUserId);
                        needsUpdate = true;
                    }
                    // If it already has an OAuthProvider, we just allow the login since the email matches
                    // We can optionally update the name if it's empty
                    if (string.IsNullOrEmpty(existingEmailAccount.FullName) && !string.IsNullOrEmpty(name))
                    {
                        existingEmailAccount.UpdateFullName(name);
                        needsUpdate = true;
                    }

                    if (needsUpdate)
                    {
                        await _accounts.UpdateAsync(existingEmailAccount, ct);
                    }
                    
                    account = existingEmailAccount;
                }
            }

            if (account == null)
            {
                // Create new account
                account = PassportAccount.CreateWithOAuth(provider, oAuthUserId, email ?? "", name);
                await _accounts.CreateAsync(account, ct);
            }
            
            traveler.LinkAccount(account.Id);
            await _travelers.UpdateAsync(traveler, ct);
        }
        else if (traveler.IsAnonymous)
        {
            // Account exists and the current session is anonymous.
            // Find the persistent traveler already linked to this account and use it,
            // migrating any data (dolls, XP) the user accumulated anonymously.
            var existingTraveler = await _travelers.GetByLinkedAccountIdAsync(account.Id, ct);
            if (existingTraveler != null)
            {
                await MigrateAnonymousDataAsync(traveler.Id, existingTraveler.Id, ct);
                traveler = existingTraveler;
            }
            else
            {
                traveler.LinkAccount(account.Id);
                await _travelers.UpdateAsync(traveler, ct);
            }
        }

        var jwt = _auth.GenerateJwt(traveler.Id, email, true);
        _logger.LogInformation("Account linked for TravelerId={TravelerId} Provider={Provider}", traveler.Id, provider);

        return Redirect($"{frontendUrl}/auth/callback?token={jwt}");
    }

    /// <summary>POST /api/v1/auth/refresh</summary>
    [HttpPost("auth/refresh")]
    public IActionResult RefreshToken()
    {
        // Read JWT from Authorization header or vitale_jwt cookie
        var token = Request.Cookies["vitale_jwt"]
                    ?? Request.Headers["Authorization"].FirstOrDefault()?.Replace("Bearer ", "");

        if (string.IsNullOrEmpty(token))
            throw new UnauthorizedException("No token to refresh");

        var result = _auth.ValidateJwt(token);
        if (result == null)
            throw new UnauthorizedException("Token expired or invalid");

        var newToken = _auth.GenerateJwt(result.Id, result.EmailOrUsername, result.IsRegistered);
        var expires = DateTime.UtcNow.AddDays(7);

        // Set new JWT cookie
        Response.Cookies.Append("vitale_jwt", newToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = expires,
            Path = "/"
        });

        // Set refresh token cookie (using JWT generation method since we are using stateless refresh window for MVP)
        Response.Cookies.Append("vitale_refresh_token", _auth.GenerateRefreshToken(), new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(30),
            Path = "/"
        });

        return Ok(new RefreshTokenResponse(newToken, expires));
    }

    /// <summary>POST /api/v1/auth/logout - Clear JWT cookie</summary>
    [HttpPost("auth/logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete("vitale_jwt");
        Response.Cookies.Delete("vitale_refresh_token");
        Response.Cookies.Delete("vitale_session"); // Clear anonymous session
        return Ok(new { success = true, message = "Logged out successfully" });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Email/Password Authentication
    // ══════════════════════════════════════════════════════════════════════════

    /// <summary>POST /api/v1/auth/register - Register with email and password</summary>
    [HttpPost("auth/register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        // 1. Validate email format
        if (!_emailValidation.IsValidEmailFormat(request.Email))
            return BadRequest(new { error = "Invalid email format or disposable email not allowed" });

        // 2. Check if email domain is valid (DNS MX check)
        var isValidDomain = await _emailValidation.IsValidEmailDomainAsync(request.Email, ct);
        if (!isValidDomain)
            return BadRequest(new { error = "Email domain does not exist" });

        // 3. Check if email already exists
        var existingAccount = await _accounts.GetByEmailAsync(request.Email, ct);
        if (existingAccount != null)
            return Conflict(new { error = "Email already registered" });

        // 4. Hash password
        var passwordHash = _auth.HashPassword(request.Password);

        // 5. Create account
        var account = PassportAccount.CreateWithEmailPassword(request.Email, passwordHash, request.FullName);
        await _accounts.CreateAsync(account, ct);

        // 6. Link to current traveler or create new traveler
        var traveler = await GetCurrentTravelerAsync();
        if (traveler.IsAnonymous)
        {
            traveler.LinkAccount(account.Id);
            await _travelers.UpdateAsync(traveler, ct);
        }

        // 7. Send verification email
        var emailSent = await _emailService.SendEmailVerificationAsync(
            request.Email,
            request.FullName,
            account.EmailVerificationToken!,
            ct);

        if (!emailSent)
        {
            _logger.LogWarning("Failed to send verification email to {Email}", request.Email);
        }

        _logger.LogInformation("New account registered: {Email}", request.Email);

        return Ok(new RegisterResponse(
            true,
            "Registration successful! Please check your email to verify your account."));
    }

    /// <summary>POST /api/v1/auth/login - Login with email and password</summary>
    [HttpPost("auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        // 1. Find account by email
        var account = await _accounts.GetByEmailAsync(request.Email, ct);
        if (account == null)
            return Unauthorized(new { error = "Invalid email or password" });

        // 2. Check if account is locked
        if (account.IsLocked)
            return Unauthorized(new { error = "Account is locked. Please contact support." });

        // 3. Verify password
        if (account.PasswordHash == null || !_auth.VerifyPassword(request.Password, account.PasswordHash))
            return Unauthorized(new { error = "Invalid email or password" });

        // 4. Check email verification
        if (!account.IsEmailVerified)
            return Unauthorized(new { error = "Please verify your email before logging in" });

        // 5. Update last login
        account.UpdateLastLogin();
        await _accounts.UpdateAsync(account, ct);

        // 6. Link to current traveler or find existing traveler.
        // First check if a Traveler is ALREADY linked to this account to prevent data loss!
        var existingTraveler = await _travelers.GetByLinkedAccountIdAsync(account.Id, ct);

        Traveler traveler;
        if (existingTraveler != null)
        {
            // Persistent traveler found. Migrate any dolls/XP the user collected
            // on the current anonymous session (different traveler) before switching.
            var currentTraveler = await GetCurrentTravelerAsync();
            if (currentTraveler.IsAnonymous && currentTraveler.Id != existingTraveler.Id)
            {
                await MigrateAnonymousDataAsync(currentTraveler.Id, existingTraveler.Id, ct);
            }
            traveler = existingTraveler;
        }
        else
        {
            traveler = await GetCurrentTravelerAsync();
            if (traveler.IsAnonymous)
            {
                traveler.LinkAccount(account.Id);
                await _travelers.UpdateAsync(traveler, ct);
            }
        }

        // 7. Generate JWT
        var jwt = _auth.GenerateJwt(traveler.Id, account.Email, true);
        var expires = DateTime.UtcNow.AddDays(7);

        // 8. Set JWT cookie
        Response.Cookies.Append("vitale_jwt", jwt, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = expires,
            Path = "/"
        });

        Response.Cookies.Append("vitale_refresh_token", _auth.GenerateRefreshToken(), new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Expires = DateTime.UtcNow.AddDays(30),
            Path = "/"
        });

        _logger.LogInformation("User logged in: {Email}", account.Email);

        return Ok(new
        {
            token = jwt,
            user = new { id = traveler.Id, email = account.Email, fullName = account.FullName, hasPassword = account.PasswordHash != null },
            jwt = jwt,
            expiresAt = expires,
            traveler = new TravelerDto(traveler.Id, account.Email, true)
        });
    }

    /// <summary>GET /api/v1/auth/verify-email?token={token} - Verify email address</summary>
    [HttpGet("auth/verify-email")]
    public async Task<IActionResult> VerifyEmail([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(token) || token.Length != 32)
            return BadRequest(new { error = "Invalid verification token" });

        // 1. Find account by token
        var account = await _accounts.GetByEmailVerificationTokenAsync(token, ct);
        if (account == null)
            return BadRequest(new { error = "Invalid or expired verification token" });

        // 2. Verify email
        var success = account.VerifyEmail(token);
        if (!success)
            return BadRequest(new { error = "Invalid or expired verification token" });

        // 3. Save
        await _accounts.UpdateAsync(account, ct);

        // 4. Send welcome email
        await _emailService.SendWelcomeEmailAsync(account.Email, account.FullName ?? "Traveler", ct);

        _logger.LogInformation("Email verified: {Email}", account.Email);

        return Ok(new { message = "Email verified successfully" });
    }

    /// <summary>POST /api/v1/auth/forgot-password - Request password reset</summary>
    [HttpPost("auth/forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        // Always return success to prevent email enumeration
        var successMessage = "If your email is registered, you will receive a password reset link.";

        // 1. Find account by email
        var account = await _accounts.GetByEmailAsync(request.Email, ct);
        if (account == null)
        {
            _logger.LogWarning("Password reset requested for non-existent email: {Email}", request.Email);
            return Ok(new ForgotPasswordResponse(true, successMessage));
        }

        // 2. Check if account is locked
        if (account.IsLocked)
        {
            _logger.LogWarning("Password reset requested for locked account: {Email}", request.Email);
            return Ok(new ForgotPasswordResponse(true, successMessage));
        }

        // 3. Generate reset token
        account.GeneratePasswordResetToken();
        await _accounts.UpdateAsync(account, ct);

        // 4. Send reset email
        var emailSent = await _emailService.SendPasswordResetAsync(
            account.Email,
            account.FullName ?? "User",
            account.PasswordResetToken!,
            ct);

        if (!emailSent)
        {
            _logger.LogError("Failed to send password reset email to {Email}", account.Email);
        }

        _logger.LogInformation("Password reset requested: {Email}", account.Email);

        return Ok(new ForgotPasswordResponse(true, successMessage));
    }

    /// <summary>GET /api/v1/auth/reset-password - Validate reset token</summary>
    [HttpGet("auth/reset-password")]
    public async Task<IActionResult> ValidateResetToken([FromQuery] string token, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { error = "Token is required" });
            
        var account = await _accounts.GetByPasswordResetTokenAsync(token, ct);
        if (account == null)
            return BadRequest(new { error = "Invalid or expired reset token" });
            
        if (account.PasswordResetTokenExpiresAt == null || DateTime.UtcNow > account.PasswordResetTokenExpiresAt)
            return BadRequest(new { error = "Invalid or expired reset token" });
            
        return Ok(new { success = true });
    }

    /// <summary>POST /api/v1/auth/reset-password - Reset password with token</summary>
    [HttpPost("auth/reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        // 1. Find account by reset token
        var account = await _accounts.GetByPasswordResetTokenAsync(request.Token, ct);
        if (account == null)
            return BadRequest(new { error = "Invalid or expired reset token" });

        // 2. Hash new password
        var newPasswordHash = _auth.HashPassword(request.NewPassword);

        // 3. Reset password
        var success = account.ResetPassword(request.Token, newPasswordHash);
        if (!success)
            return BadRequest(new { error = "Invalid or expired reset token" });

        // 4. Save
        await _accounts.UpdateAsync(account, ct);

        _logger.LogInformation("Password reset successful: {Email}", account.Email);

        return Ok(new ResetPasswordResponse(true, "Password reset successful. You can now login with your new password."));
    }

    /// <summary>POST /api/v1/auth/resend-verification - Resend verification email</summary>
    [HttpPost("auth/resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        var account = await _accounts.GetByEmailAsync(request.Email, ct);
        if (account == null || account.IsEmailVerified)
        {
            // Don't reveal if email exists
            return Ok(new { success = true, message = "If your email is not verified, you will receive a verification link." });
        }

        // Generate new token
        account.GenerateEmailVerificationToken();
        await _accounts.UpdateAsync(account, ct);

        // Send email
        await _emailService.SendEmailVerificationAsync(
            account.Email,
            account.FullName ?? "User",
            account.EmailVerificationToken!,
            ct);

        return Ok(new { success = true, message = "Verification email sent." });
    }

    /// <summary>POST /api/v1/auth/profile - Update profile info (Full Name)</summary>
    [HttpPost("auth/profile")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var traveler = await GetCurrentTravelerAsync();
        if (traveler.IsAnonymous || traveler.LinkedAccountId == null)
            return Unauthorized(new { error = "Not logged in" });

        var account = await _accounts.GetByIdAsync(traveler.LinkedAccountId.Value, ct);
        if (account == null)
            return Unauthorized(new { error = "Account not found" });

        account.UpdateFullName(request.FullName);
        await _accounts.UpdateAsync(account, ct);

        // Also issue a new JWT so the frontend can update its state if needed, or frontend can just rely on the API success
        var token = _auth.GenerateJwt(traveler.Id, account.Email, true);
        
        return Ok(new { success = true, token, message = "Profile updated successfully." });
    }

    /// <summary>POST /api/v1/auth/change-password - Change current password</summary>
    [HttpPost("auth/change-password")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request, CancellationToken ct)
    {
        var traveler = await GetCurrentTravelerAsync();
        if (traveler.IsAnonymous || traveler.LinkedAccountId == null)
            return Unauthorized(new { error = "Not logged in" });

        var account = await _accounts.GetByIdAsync(traveler.LinkedAccountId.Value, ct);
        if (account == null)
            return Unauthorized(new { error = "Account not found" });

        if (account.OAuthProvider != null)
            return BadRequest(new { error = "Cannot change password for social login accounts." });

        if (account.PasswordHash == null || !_auth.VerifyPassword(request.CurrentPassword, account.PasswordHash))
            return BadRequest(new { error = "Mật khẩu hiện tại không đúng." }); // localized response

        var newPasswordHash = _auth.HashPassword(request.NewPassword);
        account.ChangePassword(newPasswordHash);
        await _accounts.UpdateAsync(account, ct);

        return Ok(new { success = true, message = "Mật khẩu đã được cập nhật thành công." });
    }

    [HttpGet("debug-jwt")]
    [Microsoft.AspNetCore.Authorization.Authorize(AuthenticationSchemes = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme)]
    public IActionResult DebugJwt()
    {
        var claims = HttpContext.User.Claims.Select(c => new { c.Type, c.Value }).ToList();
        return Ok(new { claims });
    }

    /// <summary>GET /api/v1/auth/profile - Get profile info</summary>
    [HttpGet("auth/profile")]
    public async Task<IActionResult> GetProfile(CancellationToken ct)
    {
        var traveler = await GetCurrentTravelerAsync();
        
        _logger.LogWarning("GetProfile invoked. Traveler ID: {Id}, IsAnonymous: {IsAnonymous}, LinkedAccountId: {LinkedAccountId}", 
            traveler.Id, traveler.IsAnonymous, traveler.LinkedAccountId);

        if (traveler.IsAnonymous || traveler.LinkedAccountId == null)
        {
            _logger.LogInformation("GetProfile: Returning anonymous profile for Traveler {Id}", traveler.Id);
            return Ok(new { id = traveler.Id, isRegistered = false, fullName = "Khách", email = "" });
        }

        var account = await _accounts.GetByIdAsync(traveler.LinkedAccountId.Value, ct);
        if (account == null)
        {
            _logger.LogWarning("Returning 401 Account not found for LinkedAccountId {LinkedAccountId}", traveler.LinkedAccountId.Value);
            return Unauthorized(new { error = "Account not found" });
        }

        return Ok(new { id = traveler.Id, isRegistered = true, fullName = account.FullName, email = account.Email, hasPassword = account.PasswordHash != null });
    }

    // ════════════════════════════════════════════════════════════════════
    // Data Migration Helper
    // ════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Migrates DollTokens claimed by an anonymous traveler to the user's persistent traveler.
    /// Also re-parents the UserGamificationProfile rows if present.
    /// This prevents doll loss after logout → login.
    /// </summary>
    private async Task MigrateAnonymousDataAsync(Guid fromTravelerId, Guid toTravelerId, CancellationToken ct)
    {
        if (fromTravelerId == toTravelerId) return;

        // Migrate unclaimed / claimed-but-not-used doll tokens
        var orphanedDollTokens = await _db.DollTokens
            .Where(t => t.UserId == fromTravelerId)
            .ToListAsync(ct);

        if (orphanedDollTokens.Count > 0)
        {
            foreach (var token in orphanedDollTokens)
            {
                token.ReassignUser(toTravelerId);
            }
            _logger.LogInformation(
                "Migrated {Count} doll token(s) from anonymous traveler {From} to persistent traveler {To}",
                orphanedDollTokens.Count, fromTravelerId, toTravelerId);
        }

        // Migrate UserStamps that belong to the anonymous traveler
        var orphanedStamps = await _db.UserStamps
            .Where(s => s.UserId == fromTravelerId)
            .ToListAsync(ct);

        if (orphanedStamps.Count > 0)
        {
            // Only migrate stamps for checkpoints the persistent traveler hasn't visited yet
            var existingCheckpointIds = await _db.UserStamps
                .Where(s => s.UserId == toTravelerId)
                .Select(s => s.CheckpointId)
                .ToHashSetAsync(ct);

            foreach (var stamp in orphanedStamps)
            {
                if (!existingCheckpointIds.Contains(stamp.CheckpointId))
                    stamp.ReassignUser(toTravelerId);
            }
            _logger.LogInformation(
                "Migrated stamp(s) from anonymous traveler {From} to persistent traveler {To}",
                fromTravelerId, toTravelerId);
        }

        await _db.SaveChangesAsync(ct);
    }
}
