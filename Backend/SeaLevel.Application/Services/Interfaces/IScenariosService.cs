using SeaLevel.Application.DTOs.Scenarios;

namespace SeaLevel.Application.Services.Interfaces;

public interface IScenariosService
{
    IReadOnlyList<ScenarioItem> GetScenarios();
}
