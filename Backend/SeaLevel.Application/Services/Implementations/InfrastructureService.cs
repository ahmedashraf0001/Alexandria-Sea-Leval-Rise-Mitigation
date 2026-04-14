using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Infrastructure;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SeaLevel.Application.Services.Implementations;

public class InfrastructureService : IInfrastructureService
{
    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;

    public InfrastructureService(INasaPowerClient nasaPowerClient, IMlForecastClient mlForecastClient)
    {
        _nasaPowerClient = nasaPowerClient;
        _mlForecastClient = mlForecastClient;
    }

    public async Task<InfrastructureResponse> GetInfrastructureRiskAsync(       
        string scenario,
        int year,
        IEnumerable<string>? sectors = null,
        IEnumerable<string>? risks = null,
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
        string globalRiskLevel = projectionResult.RiskLevel;

        Dictionary<string, List<FacilityItem>> groupedFacilities = new();
        List<InfrastructureFacilityDto> facilityDetails = new();

        foreach (var facility in projectionResult.AtRiskFacilities)
        {
            double floodDepthMm = Math.Max(0.0, adjustedPredictedSeaLevel - facility.ThresholdMm);
            double floodDepthMeters = floodDepthMm / 1000.0;
            
            string localStatus = "Stable";
            if (floodDepthMeters >= 1.0) localStatus = "Critical";
            else if (floodDepthMeters >= 0.5) localStatus = "Warning";

            string localRiskLevel = "منخفض";
            if (floodDepthMeters >= 1.5) localRiskLevel = "شديد";
            else if (floodDepthMeters >= 1.0) localRiskLevel = "مرتفع جدًا";
            else if (floodDepthMeters >= 0.5) localRiskLevel = "مرتفع";
            else if (floodDepthMeters >= 0.1) localRiskLevel = "متوسط";

            if (!groupedFacilities.ContainsKey(facility.Type))
            {
                groupedFacilities[facility.Type] = new List<FacilityItem>();    
            }

            groupedFacilities[facility.Type].Add(new FacilityItem
            {
                Name = facility.Name,
                Qism = facility.District,
                RiskLevel = localRiskLevel,
                ImpactDescription = facility.Impact
            });

            facilityDetails.Add(new InfrastructureFacilityDto
            {
                Id = Guid.NewGuid().ToString(),
                Name = facility.Name,
                Type = facility.Type,
                TypeLabel = facility.Type,
                Qism = facility.District,
                Lat = facility.Lat,
                Lng = facility.Lng,
                RiskLevel = localRiskLevel,
                RiskLabel = localRiskLevel,
                FloodDepth = Math.Round(floodDepthMeters, 2).ToString() + " m",
                Status = localStatus,
                Description = facility.Impact
            });
        }

        HashSet<string> sectorFilter = BuildFilterSet(sectors);
        HashSet<string> riskFilter = BuildFilterSet(risks);

        InfrastructureResponse response = new InfrastructureResponse();

        foreach (KeyValuePair<string, List<FacilityItem>> pair in groupedFacilities)
        {
            if (sectorFilter.Count > 0 && !sectorFilter.Contains(pair.Key))     
            {
                continue;
            }

            IEnumerable<FacilityItem> filteredItems = pair.Value;
            if (riskFilter.Count > 0)
            {
                filteredItems = filteredItems.Where(item => riskFilter.Contains(item.RiskLevel));
            }

            List<FacilityItem> items = filteredItems.ToList();
            if (items.Count > 0)
            {
                response.Categories[pair.Key] = items;
            }
        }

        var filteredDetails = facilityDetails.AsEnumerable();
        if (sectorFilter.Count > 0)
        {
            filteredDetails = filteredDetails.Where(d => sectorFilter.Contains(d.Type));
        }
        if (riskFilter.Count > 0)
        {
            filteredDetails = filteredDetails.Where(d => riskFilter.Contains(d.RiskLevel));
        }
        
        response.Facilities = filteredDetails.ToList();

        return response;
    }

    private static HashSet<string> BuildFilterSet(IEnumerable<string>? values)  
    {
        if (values is null)
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);       
        }

        HashSet<string> set = new(StringComparer.OrdinalIgnoreCase);
        foreach (string value in values)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                set.Add(value.Trim());
            }
        }

        return set;
    }
}
