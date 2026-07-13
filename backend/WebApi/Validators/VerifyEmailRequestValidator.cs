using FluentValidation;
using Application.DTOs;

namespace WebApi.Validators;

public class VerifyEmailRequestValidator : AbstractValidator<VerifyEmailRequest>
{
    public VerifyEmailRequestValidator()
    {
        RuleFor(x => x.Token)
            .NotEmpty().WithMessage("Verification token is required")
            .Length(32).WithMessage("Invalid token format");
    }
}