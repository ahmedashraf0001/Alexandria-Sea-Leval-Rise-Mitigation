using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Analytics;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analyticsService;

    public AnalyticsController(IAnalyticsService analyticsService)
    {
        _analyticsService = analyticsService;
    }

    [HttpGet("charts")]
    public async Task<ActionResult<AnalyticsChartsResponse>> GetCharts(
        [FromQuery] ScenarioYearQuery query,
        CancellationToken cancellationToken)
    {
        AnalyticsChartsResponse response = await _analyticsService.GetChartsAsync(
            query.Scenario,
            query.Year,
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
