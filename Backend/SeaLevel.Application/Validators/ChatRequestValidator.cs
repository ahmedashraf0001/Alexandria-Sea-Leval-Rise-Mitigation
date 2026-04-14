using FluentValidation;
using SeaLevel.Application.DTOs.Chat;

namespace SeaLevel.Application.Validators;

public class ChatRequestValidator : AbstractValidator<ChatRequest>
{
    public ChatRequestValidator()
    {
        RuleFor(request => request.Message)
            .NotEmpty()
            .MinimumLength(2)
            .MaximumLength(1000);

        RuleFor(request => request.Context)
            .NotNull()
            .SetValidator(new ChatContextValidator());
    }
}
