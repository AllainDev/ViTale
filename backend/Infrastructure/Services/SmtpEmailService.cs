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
        var escapedToken = Uri.EscapeDataString(verificationToken);
        var verificationUrl = $"{_frontendUrl}/auth/verify-email?token={escapedToken}";
        var subject = "Verify your email address - ViTale";
        
        var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", "Emails", "Verification.html");
        var body = await File.ReadAllTextAsync(templatePath, ct);
        body = body.Replace("{{FullName}}", fullName)
                   .Replace("{{VerificationUrl}}", verificationUrl);

        return await SendEmailAsync(toEmail, subject, body, ct);
    }

    public async Task<bool> SendPasswordResetAsync(string toEmail, string fullName, string resetToken, CancellationToken ct = default)
    {
        var escapedToken = Uri.EscapeDataString(resetToken);
        var resetUrl = $"{_frontendUrl}/auth/reset-password?token={escapedToken}";
        var subject = "Reset your password - ViTale";
        
        var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", "Emails", "PasswordReset.html");
        var body = await File.ReadAllTextAsync(templatePath, ct);
        body = body.Replace("{{FullName}}", fullName)
                   .Replace("{{ResetUrl}}", resetUrl);

        return await SendEmailAsync(toEmail, subject, body, ct);
    }

    public async Task<bool> SendWelcomeEmailAsync(string toEmail, string fullName, CancellationToken ct = default)
    {
        var subject = "Welcome to ViTale!";
        
        var templatePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Templates", "Emails", "Welcome.html");
        var body = await File.ReadAllTextAsync(templatePath, ct);
        body = body.Replace("{{FullName}}", fullName)
                   .Replace("{{FrontendUrl}}", _frontendUrl);

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
