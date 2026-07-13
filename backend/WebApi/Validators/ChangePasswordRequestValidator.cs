using FluentValidation;
using Application.DTOs;
using System.Linq;

namespace WebApi.Validators;

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword)
            .NotEmpty().WithMessage("Current password is required");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .Must(ContainDigit).WithMessage("Password must contain at least one number")
            .Must(NotContainSpace).WithMessage("Password must not contain spaces")
            .NotEqual(x => x.CurrentPassword).WithMessage("New password must be different from current password");
    }

    private bool ContainDigit(string password) => password != null && password.Any(char.IsDigit);
    private bool NotContainSpace(string password) => password != null && !password.Contains(' ');
}