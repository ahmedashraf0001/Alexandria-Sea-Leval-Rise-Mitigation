using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Infrastructure;
using SeaLevel.Application.DTOs.Queries;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/infrastructure")]
public class InfrastructureController : ControllerBase
{
    private readonly IInfrastructureService _infrastructureService;

    public InfrastructureController(IInfrastructureService infrastructureService)
    {
        _infrastructureService = infrastructureService;
    }

    [HttpGet]
    public async Task<ActionResult<InfrastructureResponse>> Get(
        [FromQuery] InfrastructureQuery query,
        CancellationToken cancellationToken)
    {
        IEnumerable<string>? sectorFilters = ParseFilterCsv(query.Sectors);
        IEnumerable<string>? riskFilters = ParseFilterCsv(query.Risks);

        InfrastructureResponse response = await _infrastructureService.GetInfrastructureRiskAsync(
            query.Scenario,
            query.Year,
            sectorFilters,
            riskFilters,
            cancellationToken: cancellationToken);

        return Ok(response);
    }

    private static IEnumerable<string>? ParseFilterCsv(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv))
        {
            return null;
        }

        List<string> values = csv
            .Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToList();

        return values;
    }
}
