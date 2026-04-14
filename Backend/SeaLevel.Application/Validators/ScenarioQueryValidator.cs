using FluentValidation;
using SeaLevel.Application.DTOs.Queries;

namespace SeaLevel.Application.Validators;

public class ScenarioQueryValidator : AbstractValidator<ScenarioQuery>
{
    public ScenarioQueryValidator()
    {
        RuleFor(query => query.Scenario)
            .NotEmpty()
            .Must(value => value is "SSP126" or "SSP245" or "SSP370" or "SSP585")
            .WithMessage("Scenario must be one of SSP126, SSP245, SSP370, SSP585.");
    }
}
