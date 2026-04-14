using FluentValidation;
using SeaLevel.Application.DTOs.Queries;

namespace SeaLevel.Application.Validators;

public class ScenarioYearQueryValidator : AbstractValidator<ScenarioYearQuery>
{
    public ScenarioYearQueryValidator()
    {
        RuleFor(query => query.Scenario)
            .NotEmpty()
            .Must(value => value is "SSP126" or "SSP245" or "SSP370" or "SSP585")
            .WithMessage("Scenario must be one of SSP126, SSP245, SSP370, SSP585.");

        RuleFor(query => query.Year)
            .Must(value => value is 2030 or 2050 or 2070 or 2100)
            .WithMessage("Year must be one of 2030, 2050, 2070, 2100.");
    }
}
