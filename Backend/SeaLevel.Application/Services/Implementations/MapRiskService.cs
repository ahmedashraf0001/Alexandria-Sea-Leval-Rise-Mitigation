using SeaLevel.Core.Entities;
using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.MapRisk;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;
using SeaLevel.Core.Interfaces;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;
using System;

namespace SeaLevel.Application.Services.Implementations;

public class MapRiskService : IMapRiskService
{
    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;
    private readonly IForecastLogRepository _forecastLogRepository;
    private readonly ILandUseFeatureRepository _landUseRepository;

    public MapRiskService(
        INasaPowerClient nasaPowerClient,
        IMlForecastClient mlForecastClient,
        IForecastLogRepository forecastLogRepository,
        ILandUseFeatureRepository landUseRepository)
    {
        _nasaPowerClient = nasaPowerClient;
        _mlForecastClient = mlForecastClient;
        _forecastLogRepository = forecastLogRepository;
        _landUseRepository = landUseRepository;
    }

    public async Task<MapRiskResponse> GetMapRiskAsync(
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default)
    {
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


        // Fetch zones from DB
        var dbFeatures = await _landUseRepository.GetAllAsync(cancellationToken);
        var projectionResult = ProjectionEngine.Calculate(basePredictedSeaLevel);

        var zones = dbFeatures
            .Where(feature => !string.IsNullOrWhiteSpace(feature.District))
            .GroupBy(feature => feature.District.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => new ZoneThresholdDto
            {
                Name = group.Key,
                ThresholdMm = group.Min(feature => feature.ThresholdMm)
            })
            .OrderBy(zone => zone.ThresholdMm)
            .ThenBy(zone => zone.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();

        var activeZones = zones
            .Where(zone => basePredictedSeaLevel >= zone.ThresholdMm)
            .Select(zone => zone.Name)
            .ToList();

        return new MapRiskResponse
        {
            ProjectedSeaLevelMm = Math.Round(basePredictedSeaLevel, 2),
            FloodedAreaKm2 = Math.Round(projectionResult.FloodedAreaKm2, 2),
            RiskLevel = projectionResult.RiskLevel,
            ColorCode = projectionResult.ColorCode,
            Description = projectionResult.RiskDescription,
            Zones = zones
        };
    }
}
