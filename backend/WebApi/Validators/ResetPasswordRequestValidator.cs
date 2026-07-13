using FluentValidation;
using Application.DTOs;
using System.Linq;

namespace WebApi.Validators;

public class ResetPasswordRequestValidator : AbstractValidator<ResetPasswordRequest>
{
    public ResetPasswordRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Reset token is required")
            .Length(32).WithMessage("Invalid token format");

        RuleFor(x => x.NewPassword)
            .NotEmpty().WithMessage("New password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .Must(ContainDigit).WithMessage("Password must contain at least one number")
            .Must(NotContainSpace).WithMessage("Password must not contain spaces");
    }

    private bool ContainDigit(string password) => password != null && password.Any(char.IsDigit);
    private bool NotContainSpace(string password) => password != null && !password.Contains(' ');
}