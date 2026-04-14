using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Scenarios;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Route("api/scenarios")]
public class ScenariosController : ControllerBase
{
    private readonly IScenariosService _scenariosService;

    public ScenariosController(IScenariosService scenariosService)
    {
        _scenariosService = scenariosService;
    }

    [AllowAnonymous]
    [HttpGet]
    public ActionResult<IReadOnlyList<ScenarioItem>> Get()
    {
        IReadOnlyList<ScenarioItem> scenarios = _scenariosService.GetScenarios();
        return Ok(scenarios);
    }
}
