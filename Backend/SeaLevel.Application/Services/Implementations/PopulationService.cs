using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Population;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class PopulationService : IPopulationService
{
    private readonly IMlForecastClient _mlForecastClient;

    public PopulationService(IMlForecastClient mlForecastClient)
    {
        _mlForecastClient = mlForecastClient;
    }

    public async Task<PopulationRiskResponse> GetPopulationRiskAsync(
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

        double totalPopulation = 5_500_000 + ((year - 2030) / 20.0 * 350_000);

        return new PopulationRiskResponse
        {
            TotalPopulation = Math.Round(totalPopulation, 0),
            ExposedPopulation = projectionResult.PopulationAtRisk,
            InformalSettlementsExposure = projectionResult.InformalSettlementsExposure,
            Qisms = projectionResult.Qisms.Select(q => new QismRisk
            {
                Name = q.Name,
                ExposedPopulation = q.ExposedPopulation,
                FloodedAreaKm2 = Math.Round(q.FloodedAreaKm2, 2),
                RiskLevel = q.RiskLevel
            }).ToList()
        };
    }
}
