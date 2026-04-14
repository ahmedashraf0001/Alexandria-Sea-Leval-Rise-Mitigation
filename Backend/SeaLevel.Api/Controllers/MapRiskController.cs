using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.MapRisk;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/map-risk")]
public class MapRiskController : ControllerBase
{
    private readonly IMapRiskService _mapRiskService;

    public MapRiskController(IMapRiskService mapRiskService)
    {
        _mapRiskService = mapRiskService;
    }

    [HttpGet]
    public async Task<ActionResult<MapRiskResponse>> Get(
        [FromQuery] ScenarioYearQuery query,
        CancellationToken cancellationToken)
    {
        MapRiskResponse response = await _mapRiskService.GetMapRiskAsync(
            query.Scenario,
            query.Year,
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
