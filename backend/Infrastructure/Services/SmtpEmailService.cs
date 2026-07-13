using Application.Interfaces.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace Infrastructure.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<SmtpEmailService> _logger;
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUsername;
    private readonly string _smtpPassword;
    private readonly string _fromEmail;
    private readonly string _fromName;
    private readonly string _frontendUrl;
    private readonly bool _isConfigured;

    public SmtpEmailService(IConfiguration config, ILogger<SmtpEmailService> logger)
    {
        _config = config;
        _logger = logger;

        _smtpHost = config["SMTP_HOST"] ?? Environment.GetEnvironmentVariable("SMTP_HOST") ?? "";
        _smtpPort = int.Parse(config["SMTP_PORT"] ?? Environment.GetEnvironmentVariable("SMTP_PORT") ?? "587");
        _smtpUsername = config["SMTP_USERNAME"] ?? Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? "";
        _smtpPassword = config["SMTP_PASSWORD"] ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? "";
        _fromEmail = config["SMTP_FROM_EMAIL"] ?? Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? "noreply@vitale.com";
        _fromName = config["SMTP_FROM_NAME"] ?? Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? "ViTale";
        _frontendUrl = config["FRONTEND_URL"] ?? Environment.GetEnvironmentVariable("FRONTEND_URL") ?? "http://localhost:3000";

        _isConfigured = !string.IsNullOrEmpty(_smtpHost) && !string.IsNullOrEmpty(_smtpUsername);

        if (!_isConfigured)
        {
            _logger.LogWarning("SMTP is not configured. Email sending will be simulated.");
        }
    }

    public async Task<bool> SendEmailVerificationAsync(string toEmail, string fullName, string verificationToken, CancellationToken ct = default)
    {
        var verificationUrl = $"{_frontendUrl}/auth/verify-email?token={verificationToken}";
        
        var subject = "Verify your email address - ViTale";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to ViTale!</h1>
        </div>
        <div class='content'>
            <p>Hi <strong>{fullName}</strong>,</p>
            <p>Thank you for registering a ViTale account! Please verify your email to start your journey exploring Vietnamese culture.</p>
            <p style='text-align: center;'>
                <a href='{verificationUrl}' class='button'>Verify Email</a>
            </p>
            <p><strong>Note:</strong> This link will expire in 24 hours.</p>
            <p>If you did not create this account, please ignore this email.</p>
        </div>
        <div class='footer'>
            <p>© 2026 ViTale - Explore Vietnamese Culture</p>
        </div>
    </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, subject, body, ct);
    }

    public async Task<bool> SendPasswordResetAsync(string toEmail, string fullName, string resetToken, CancellationToken ct = default)
    {
        var resetUrl = $"{_frontendUrl}/auth/reset-password?token={resetToken}";
        
        var subject = "Reset your password - ViTale";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
        .warning {{ background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 15px 0; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Password Reset Request</h1>
        </div>
        <div class='content'>
            <p>Hi <strong>{fullName}</strong>,</p>
            <p>We received a request to reset the password for your account.</p>
            <p style='text-align: center;'>
                <a href='{resetUrl}' class='button'>Reset Password</a>
            </p>
            <div class='warning'>
                <strong>Important Notes:</strong>
                <ul>
                    <li>This link is only valid for 2 hours</li>
                    <li>This link can only be used once</li>
                    <li>If you didn't request a password reset, you can safely ignore this email</li>
                </ul>
            </div>
        </div>
        <div class='footer'>
            <p>© 2026 ViTale - Explore Vietnamese Culture</p>
        </div>
    </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, subject, body, ct);
    }

    public async Task<bool> SendWelcomeEmailAsync(string toEmail, string fullName, CancellationToken ct = default)
    {
        var subject = "Welcome to ViTale!";
        var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
        .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
        .feature {{ background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #667eea; }}
        .button {{ display: inline-block; padding: 15px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
        .footer {{ text-align: center; margin-top: 20px; color: #666; font-size: 12px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to ViTale!</h1>
        </div>
        <div class='content'>
            <p>Hi <strong>{fullName}</strong>,</p>
            <p>Your account has been successfully verified! You can now:</p>
            
            <div class='feature'>
                <strong>Explore Destinations</strong><br/>
                Discover unique cultural sites across Vietnam
            </div>
            
            <div class='feature'>
                <strong>Collect Badges</strong><br/>
                Check-in at destinations and earn special badges
            </div>
            
            <div class='feature'>
                <strong>Chat with AI</strong><br/>
                Converse with AI characters to learn about local culture
            </div>
            
            <div class='feature'>
                <strong>Earn Rewards</strong><br/>
                Use vouchers from our partners
            </div>
            
            <p style='text-align: center;'>
                <a href='{_frontendUrl}' class='button'>Start Exploring</a>
            </p>
            
            <p>Have a wonderful experience!</p>
        </div>
        <div class='footer'>
            <p>© 2026 ViTale - Explore Vietnamese Culture</p>
        </div>
    </div>
</body>
</html>";

        return await SendEmailAsync(toEmail, subject, body, ct);
    }

    private async Task<bool> SendEmailAsync(string toEmail, string subject, string htmlBody, CancellationToken ct)
    {
        if (!_isConfigured)
        {
            _logger.LogInformation("SIMULATED EMAIL: To={To}, Subject={Subject}", toEmail, subject);
            _logger.LogDebug("Email body: {Body}", htmlBody);
            return true; // Simulate success
        }

        try
        {
            using var smtpClient = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_smtpUsername, _smtpPassword),
                Timeout = 30000 // 30 seconds
            };

            using var message = new MailMessage
            {
                From = new MailAddress(_fromEmail, _fromName),
                Subject = subject,
                Body = htmlBody,
                IsBodyHtml = true
            };

            message.To.Add(toEmail);

            await smtpClient.SendMailAsync(message, ct);
            _logger.LogInformation("Email sent successfully to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}", toEmail);
            return false;
        }
    }
}
