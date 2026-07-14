namespace Application.Interfaces.Services;

public interface IEmailService
{
    Task<bool> SendEmailVerificationAsync(string toEmail, string fullName, string verificationToken, CancellationToken ct = default);
    Task<bool> SendPasswordResetAsync(string toEmail, string fullName, string resetToken, CancellationToken ct = default);
    Task<bool> SendWelcomeEmailAsync(string toEmail, string fullName, CancellationToken ct = default);
}
