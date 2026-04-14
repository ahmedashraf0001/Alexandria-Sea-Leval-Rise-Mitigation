using FluentValidation;
using SeaLevel.Application.DTOs.Auth;

namespace SeaLevel.Application.Validators;

public class RegisterRequestValidator : AbstractValidator<RegisterRequest>
{
    public RegisterRequestValidator()
    {
        RuleFor(request => request.Email)
            .NotEmpty()
            .EmailAddress();

        RuleFor(request => request.Password)
            .NotEmpty()
            .MinimumLength(8);

        RuleFor(request => request.Username)
            .NotEmpty()
            .MinimumLength(3)
            .MaximumLength(64);
    }
}
