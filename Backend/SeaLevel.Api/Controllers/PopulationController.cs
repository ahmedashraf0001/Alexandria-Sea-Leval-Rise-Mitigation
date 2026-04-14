using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Population;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/population")]
public class PopulationController : ControllerBase
{
    private readonly IPopulationService _populationService;

    public PopulationController(IPopulationService populationService)
    {
        _populationService = populationService;
    }

    [HttpGet]
    public async Task<ActionResult<PopulationRiskResponse>> Get(
        [FromQuery] ScenarioYearQuery query,
        CancellationToken cancellationToken)
    {
        PopulationRiskResponse response = await _populationService.GetPopulationRiskAsync(
            query.Scenario,
            query.Year,
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
