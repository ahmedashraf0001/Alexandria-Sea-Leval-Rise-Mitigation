using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.MapRisk;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[AllowAnonymous]
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
        CancellationToken cancellationToken)
    {
        MapRiskResponse response = await _mapRiskService.GetMapRiskAsync(
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
