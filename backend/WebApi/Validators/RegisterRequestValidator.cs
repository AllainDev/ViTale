using FluentValidation;
using Application.DTOs;
using System.Linq;

namespace WebApi.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(255).WithMessage("Email is too long");

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("Password is required")
            .MinimumLength(8).WithMessage("Password must be at least 8 characters")
            .Must(ContainDigit).WithMessage("Password must contain at least one number")
            .Must(NotContainSpace).WithMessage("Password must not contain spaces");

        RuleFor(x => x.FullName)
            .NotEmpty().WithMessage("Full name is required")
            .MinimumLength(2).WithMessage("Full name must be at least 2 characters")
            .MaximumLength(100).WithMessage("Full name is too long");
    }

    private bool ContainDigit(string password) => password != null && password.Any(char.IsDigit);
    private bool NotContainSpace(string password) => password != null && !password.Contains(' ');
}