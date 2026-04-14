using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.DTOs.Reports;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/reports")]
public class ReportsController : ControllerBase
{
    private readonly IReportService _reportService;

    public ReportsController(IReportService reportService)
    {
        _reportService = reportService;
    }

    [HttpGet("statistics")]
    public async Task<ActionResult<ReportStatisticsResponse>> GetStatistics(
        [FromQuery] ScenarioYearQuery query,
        CancellationToken cancellationToken)
    {
        ReportStatisticsResponse response = await _reportService.GetStatisticsAsync(
            query.Scenario,
            query.Year,
            cancellationToken: cancellationToken);

        return Ok(response);
    }
}
