using SeaLevel.Application.DTOs.Analytics;
using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace SeaLevel.Application.Services.Implementations;

public class AnalyticsService : IAnalyticsService
{
    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;

    public AnalyticsService(INasaPowerClient nasaPowerClient, IMlForecastClient mlForecastClient)
    {
        _nasaPowerClient = nasaPowerClient;
        _mlForecastClient = mlForecastClient;
    }

    public async Task<AnalyticsChartsResponse> GetChartsAsync(
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

        List<ExposureDataItem> exposureData = new();
        List<int> years = new() { 2030, 2050, 2070, 2100 };
        foreach (int targetYear in years)
        {
            double adjusted1 = RiskMappingHelper.ApplyScenarioAndYearAdjustment(basePredictedSeaLevel, "SSP126", targetYear);
            double adjusted5 = RiskMappingHelper.ApplyScenarioAndYearAdjustment(basePredictedSeaLevel, "SSP585", targetYear);
            
            var proj1 = ProjectionEngine.Calculate(adjusted1);
            var proj5 = ProjectionEngine.Calculate(adjusted5);

            exposureData.Add(new ExposureDataItem
            {
                Year = targetYear,
                Ssp1 = Math.Round(proj1.FloodedAreaKm2, 1),
                Ssp5 = Math.Round(proj5.FloodedAreaKm2, 1)
            });
        }

        double currentAdjusted = RiskMappingHelper.ApplyScenarioAndYearAdjustment(basePredictedSeaLevel, scenario, year);
        ProjectionResult currentProjection = ProjectionEngine.Calculate(currentAdjusted);
        double vulnerabilityIndex = CalculateVulnerabilityIndex(currentProjection, year);
        string vulnerabilityLevel = GetVulnerabilityLevel(vulnerabilityIndex);

        List<HousingDataItem> housingData = BuildHousingData(
            vulnerabilityIndex,
            currentProjection.RiskLevel,
            currentProjection.InformalSettlementsExposure);

        return new AnalyticsChartsResponse
        {
            HousingData = housingData,
            ExposureData = exposureData,
            VulnerabilityIndex = vulnerabilityIndex,
            VulnerabilityLevel = vulnerabilityLevel
        };
    }

    private static List<HousingDataItem> BuildHousingData(
        double vulnerabilityIndex,
        string riskLevel,
        string informalExposure)
    {
        double vulnerableShare = Math.Clamp(vulnerabilityIndex, 0.0, 100.0);

        double highFactor = riskLevel switch
        {
            "كارثي" => 0.42,
            "شديد" => 0.38,
            "مرتفع جدًا" => 0.34,
            "مرتفع" => 0.30,
            "متوسط" => 0.24,
            _ => 0.18
        };

        double informalFactor = informalExposure switch
        {
            "كارثي" => 0.24,
            "شديد" => 0.20,
            "مرتفع" => 0.16,
            "متوسط" => 0.12,
            _ => 0.08
        };

        double mediumFactor = riskLevel switch
        {
            "كارثي" => 0.28,
            "شديد" => 0.28,
            "مرتفع جدًا" => 0.30,
            "مرتفع" => 0.32,
            "متوسط" => 0.34,
            _ => 0.36
        };

        double lowFactor = Math.Max(0.08, 1.0 - highFactor - mediumFactor - informalFactor);
        double totalFactor = highFactor + mediumFactor + lowFactor + informalFactor;

        if (totalFactor <= 0)
        {
            highFactor = 0.30;
            mediumFactor = 0.35;
            lowFactor = 0.25;
            informalFactor = 0.10;
            totalFactor = 1.0;
        }

        double highShare = Math.Round(vulnerableShare * (highFactor / totalFactor), 1);
        double mediumShare = Math.Round(vulnerableShare * (mediumFactor / totalFactor), 1);
        double lowShare = Math.Round(vulnerableShare * (lowFactor / totalFactor), 1);
        double informalShare = Math.Max(0, Math.Round(vulnerableShare - highShare - mediumShare - lowShare, 1));
        double safeShare = Math.Max(0, Math.Round(100.0 - (highShare + mediumShare + lowShare + informalShare), 1));

        return new List<HousingDataItem>
        {
            new() { Name = "آمن", Value = safeShare, Color = "#22c55e" },
            new() { Name = "خطر منخفض", Value = lowShare, Color = "#84cc16" },
            new() { Name = "خطر متوسط", Value = mediumShare, Color = "#f59e0b" },
            new() { Name = "خطر مرتفع", Value = highShare, Color = "#ef4444" },
            new() { Name = "عشوائيات", Value = informalShare, Color = "#7c3aed" }
        };
    }

    private static double CalculateVulnerabilityIndex(ProjectionResult projection, int year)
    {
        double totalPopulation = Math.Round(5_500_000 + ((year - 2030) / 20.0 * 350_000), 0);
        double exposureSharePct = totalPopulation <= 0
            ? 0
            : (projection.PopulationAtRisk / totalPopulation) * 100;

        double exposureScore = Math.Min(100, exposureSharePct * 10.0);
        double riskScore = GetRiskScore(projection.RiskLevel);
        double informalScore = GetInformalExposureScore(projection.InformalSettlementsExposure);
        double floodedAreaScore = Math.Min(100, (projection.FloodedAreaKm2 / 80.0) * 100.0);

        double weightedScore =
            (0.35 * exposureScore) +
            (0.30 * riskScore) +
            (0.20 * informalScore) +
            (0.15 * floodedAreaScore);

        return Math.Round(Math.Clamp(weightedScore, 0, 100), 1);
    }

    private static double GetRiskScore(string riskLevel)
    {
        return riskLevel switch
        {
            "كارثي" => 100,
            "شديد" => 90,
            "مرتفع جدًا" => 80,
            "مرتفع" => 65,
            "متوسط" => 45,
            _ => 20
        };
    }

    private static double GetInformalExposureScore(string informalExposure)
    {
        return informalExposure switch
        {
            "كارثي" => 95,
            "شديد" => 80,
            "مرتفع" => 60,
            "متوسط" => 40,
            _ => 20
        };
    }

    private static string GetVulnerabilityLevel(double index)
    {
        if (index >= 75)
        {
            return "حرج";
        }

        if (index >= 50)
        {
            return "مرتفع";
        }

        if (index >= 25)
        {
            return "متوسط";
        }

        return "منخفض";
    }
}
