using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Population;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class PopulationService : IPopulationService
{
    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;

    public PopulationService(INasaPowerClient nasaPowerClient, IMlForecastClient mlForecastClient)
    {
        _nasaPowerClient = nasaPowerClient;
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

        DateTime fromDate = from ?? DateTime.UtcNow.AddDays(-14);
        DateTime toDate = to ?? DateTime.UtcNow;

        IEnumerable<DailyWeatherRow> weatherRows = await _nasaPowerClient.GetDailyWeatherAsync(
            fromDate,
            toDate,
            cancellationToken: cancellationToken);

        MlForecastResponse forecast = await _mlForecastClient.GetForecastAsync(
            weatherRows,
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
