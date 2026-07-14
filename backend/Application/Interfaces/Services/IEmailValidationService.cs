namespace Application.Interfaces.Services;

public interface IEmailValidationService
{
    bool IsValidEmailFormat(string email);
    Task<bool> IsValidEmailDomainAsync(string email, CancellationToken ct = default);
}
