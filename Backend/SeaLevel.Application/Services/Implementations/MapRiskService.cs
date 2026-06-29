using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.MapRisk;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class MapRiskService : IMapRiskService
{
    private readonly IMlForecastClient _mlForecastClient;

    public MapRiskService(IMlForecastClient mlForecastClient)
    {
        _mlForecastClient = mlForecastClient;
    }

    public async Task<MapRiskResponse> GetMapRiskAsync(
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

        return new MapRiskResponse
        {
            FloodedAreaKm2 = Math.Round(projectionResult.FloodedAreaKm2, 2),
            RiskLevel = projectionResult.RiskLevel,
            ColorCode = projectionResult.ColorCode,
            Description = projectionResult.RiskDescription
        };
    }
}
