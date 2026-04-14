using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Reports;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class ReportService : IReportService
{
    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;

    public ReportService(INasaPowerClient nasaPowerClient, IMlForecastClient mlForecastClient)
    {
        _nasaPowerClient = nasaPowerClient;
        _mlForecastClient = mlForecastClient;
    }

    public async Task<ReportStatisticsResponse> GetStatisticsAsync(
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
        double floodedArea = Math.Round(projectionResult.FloodedAreaKm2, 2);
        double exposedPopulation = projectionResult.PopulationAtRisk;
        double totalPopulation = Math.Round(5_500_000 + ((year - 2030) / 20.0 * 350_000), 0);
        double protectedPopulation = Math.Max(0.0, totalPopulation - exposedPopulation);

        return new ReportStatisticsResponse
        {
            FloodData = new List<FloodDataItem>
            {
                new() { Name = "Flooded Area (km2)", Value = floodedArea },
                new() { Name = "Predicted Sea Level (mm)", Value = Math.Round(adjustedPredictedSeaLevel, 2) },
                new() { Name = "Baseline Threshold (mm)", Value = 2200 }
            },
            PopulationData = new List<PopulationDataItem>
            {
                new() { Name = "Exposed Population", Value = exposedPopulation, Color = "#ef4444" },
                new() { Name = "Protected Population", Value = protectedPopulation, Color = "#22c55e" },
                new() { Name = "Total Population", Value = totalPopulation, Color = "#3b82f6" }
            }
        };
    }
}
