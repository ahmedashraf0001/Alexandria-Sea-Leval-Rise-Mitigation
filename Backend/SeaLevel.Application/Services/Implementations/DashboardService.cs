using SeaLevel.Application.DTOs.Dashboard;
using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class DashboardService : IDashboardService
{
    private readonly IMlForecastClient _mlForecastClient;

    public DashboardService(IMlForecastClient mlForecastClient)
    {
        _mlForecastClient = mlForecastClient;
    }

    public async Task<DashboardResponse> GetDashboardAsync(
        string scenario,
        int year,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
        RiskMappingHelper.ValidateScenario(scenario);
        RiskMappingHelper.ValidateYear(year);

        MlForecastResponse forecast = await _mlForecastClient.GetForecastAsync(
            cancellationToken: cancellationToken);

        double basePredictedSeaLevel = RiskMappingHelper.GetBasePredictedSeaLevel(forecast);
        double adjustedPredictedSeaLevel = RiskMappingHelper.ApplyScenarioAndYearAdjustment(
            basePredictedSeaLevel,
            scenario,
            year);

        var projectionResult = ProjectionEngine.Calculate(adjustedPredictedSeaLevel);

        return new DashboardResponse
        {
            PopulationAtRisk = projectionResult.PopulationAtRisk,
            FloodedAreaKm2 = Math.Round(projectionResult.FloodedAreaKm2, 2),
            HighRiskAreas = projectionResult.HighRiskAreas.ToList()
        };
    }
}
