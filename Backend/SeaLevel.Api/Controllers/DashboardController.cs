using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Dashboard;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/dashboard")]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;

    public DashboardController(IDashboardService dashboardService)
    {
        _dashboardService = dashboardService;
    }

    [HttpGet]
    public async Task<ActionResult<DashboardResponse>> Get(
        [FromQuery] ScenarioYearQuery query,
        CancellationToken cancellationToken)
    {
        DashboardResponse response = await _dashboardService.GetDashboardAsync(
            query.Scenario,
            query.Year,
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
