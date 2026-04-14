using System;
using System.Collections.Generic;
using System.Linq;

namespace SeaLevel.Application.Services;

public record QismResult(
    string Name,
    double FloodedAreaKm2,
    long ExposedPopulation,
    string RiskLevel
);

public record InfrastructureFacility(
    string Name,
    string District,
    string Type,
    double ThresholdMm,
    string Impact,
    double Lat,
    double Lng
);

public record ProjectionResult(
    double ProjectedSeaLevel,
    double FloodedAreaKm2,
    long PopulationAtRisk,
    string RiskLevel,
    string ColorCode,
    string RiskDescription,
    IReadOnlyList<string> HighRiskAreas,
    string InformalSettlementsExposure,
    IReadOnlyList<QismResult> Qisms,
    IReadOnlyList<InfrastructureFacility> AtRiskFacilities
);

public static class ProjectionEngine
{
    private static readonly Dictionary<int, double> BaseYearDeltas = new()
    {
        [2030] = 50.0,
        [2050] = 120.0,
        [2070] = 180.0,
        [2100] = 280.0
    };

    private static readonly Dictionary<string, double> ScenarioMultipliers = new(StringComparer.OrdinalIgnoreCase)
    {
        ["SSP126"] = 1.00,
        ["SSP245"] = 1.24,
        ["SSP370"] = 1.47,
        ["SSP585"] = 1.91
    };

    private static readonly (double AreaThresholdKm2, double DensityPerKm2)[] PopulationZones =
    [
        (5.0, 8_000),
        (15.0, 12_000),
        (35.0, 18_000),
        (70.0, 22_000),
        (double.MaxValue, 25_000),
    ];

    private static readonly (string Name, double ThresholdMm)[] Zones =
    [
        ("المكس", 2250),
        ("الدخيلة", 2300),
        ("الأنفوشي", 2450),
        ("المنشية", 2550),
        ("أبو قير", 2650),
        ("المعمورة", 2750),
        ("الجمرك", 2850),
        ("محرم بك", 2950),
        ("المدينة القديمة", 3050),
        ("معظم المناطق الساحلية", 3150),
    ];

    private static readonly InfrastructureFacility[] AllFacilities =
    [
        new("ميناء الإسكندرية",      "الجمرك",    "ميناء",    2280,
            "غرق الأرصفة",           31.1956, 29.8841),
        new("ميناء الدخيلة",         "الدخيلة",   "ميناء",    2300,
            "تعطل العمليات",          31.1347, 29.8027),
        new("مستشفى رأس التين",      "الجمرك",    "مستشفى",   2850,
            "إخلاء كامل",             31.2001, 29.8856),
        new("مستشفى المعمورة",       "المعمورة",  "مستشفى",   2750,
            "خطر الفيضان",            31.2687, 30.0632),
        new("محطة مياه النوزة",      "الجمرك",    "مياه",     2450,
            "تلوث المياه",            31.1889, 29.9043),
        new("محطة كهرباء أبو قير",   "أبو قير",   "كهرباء",   2650,
            "انقطاع الكهرباء",        31.3167, 30.0667),
        new("مطار برج العرب",        "برج العرب", "مطار",     3100,
            "تعطل المطار",            30.9177, 29.6964),
        new("الطريق الساحلي الدولي", "ساحلي",     "طريق",     2350,
            "قطع الطريق",             31.2156, 29.9512),
    ];

    public static double GetProjectedSeaLevel(double baselineMm, string scenario, int year)
    {
        if (!ScenarioMultipliers.TryGetValue(scenario, out double multiplier))
            throw new ArgumentException($"Unknown scenario: {scenario}");

        if (!BaseYearDeltas.TryGetValue(year, out double baseDelta))
            throw new ArgumentException($"Unsupported year: {year}");

        return baselineMm + (baseDelta * multiplier);
    }

    private static double CalculateFloodedAreaKm2(double seaLevelMm)
    {
        if (seaLevelMm < 2200) return 0;
        if (seaLevelMm <= 2400) return (seaLevelMm - 2200) * 0.010;
        if (seaLevelMm <= 2600) return 2.0 + (seaLevelMm - 2400) * 0.040;
        if (seaLevelMm <= 2800) return 10.0 + (seaLevelMm - 2600) * 0.090;
        if (seaLevelMm <= 3000) return 28.0 + (seaLevelMm - 2800) * 0.160;
        
        double area = 60.0 + (seaLevelMm - 3000) * 0.200;
        return Math.Min(area, 180.0);
    }

    private static long CalculatePopulationAtRisk(double floodedAreaKm2)
    {
        double remainingArea = floodedAreaKm2;
        double previousThreshold = 0;
        double totalPopulation = 0;

        foreach (var zone in PopulationZones)
        {
            if (remainingArea <= 0) break;

            double trancheArea = Math.Min(remainingArea, zone.AreaThresholdKm2 - previousThreshold);
            totalPopulation += trancheArea * zone.DensityPerKm2;
            
            remainingArea -= trancheArea;
            previousThreshold = zone.AreaThresholdKm2;
        }

        return (long)totalPopulation;
    }

    private static (string Level, string Color, string Description) GetRiskInfo(double seaLevel)
    {
        if (seaLevel < 2300) return ("منخفض", "#4CAF50", "تأثير محدود");
        if (seaLevel <= 2500) return ("متوسط", "#FFC107", "خطر متزايد");
        if (seaLevel <= 2700) return ("مرتفع", "#FF9800", "تهديد للبنية التحتية");
        if (seaLevel <= 2900) return ("مرتفع جدًا", "#FF5722", "تغلغل المياه");
        if (seaLevel <= 3100) return ("شديد", "#D32F2F", "غرق مناطق قديمة");
        return ("كارثي", "#B71C1C", "اختفاء معالم رئيسية");
    }

    private static string GetInformalSettlementsExposure(double floodedAreaKm2)
    {
        if (floodedAreaKm2 < 5) return "منخفض";
        if (floodedAreaKm2 <= 15) return "متوسط";
        if (floodedAreaKm2 <= 35) return "مرتفع";
        if (floodedAreaKm2 <= 70) return "شديد";
        return "كارثي";
    }

    private static IReadOnlyList<(string Name, double ThresholdMm)> GetUnifiedZones()
    {
        var thresholdByZone = new Dictionary<string, double>(StringComparer.Ordinal);

        foreach (var zone in Zones)
        {
            thresholdByZone[zone.Name] = zone.ThresholdMm;
        }

        // Keep population and infrastructure scopes aligned by adding facility districts
        // and using the most conservative (lowest) threshold when duplicated.
        foreach (var districtGroup in AllFacilities.GroupBy(f => f.District))
        {
            double minFacilityThreshold = districtGroup.Min(f => f.ThresholdMm);

            if (thresholdByZone.TryGetValue(districtGroup.Key, out double existingThreshold))
            {
                thresholdByZone[districtGroup.Key] = Math.Min(existingThreshold, minFacilityThreshold);
                continue;
            }

            thresholdByZone[districtGroup.Key] = minFacilityThreshold;
        }

        return thresholdByZone
            .OrderBy(item => item.Value)
            .ThenBy(item => item.Key, StringComparer.Ordinal)
            .Select(item => (Name: item.Key, ThresholdMm: item.Value))
            .ToList();
    }

    public static ProjectionResult Calculate(double projectedSeaLevel)
    {
        double floodedAreaKm2 = CalculateFloodedAreaKm2(projectedSeaLevel);
        long populationAtRisk = CalculatePopulationAtRisk(floodedAreaKm2);
        var (riskLevel, colorCode, riskDescription) = GetRiskInfo(projectedSeaLevel);
        string informalSettlementsExposure = GetInformalSettlementsExposure(floodedAreaKm2);

        var unifiedZones = GetUnifiedZones();
        var activeZones = unifiedZones
            .Where(z => projectedSeaLevel >= z.ThresholdMm)
            .ToList();

        var highRiskAreas = activeZones
            .Select(z => z.Name)
            .ToList();

        var qisms = new List<QismResult>();
        if (floodedAreaKm2 > 0 && activeZones.Count > 0)
        {
            double totalWeight = 0;
            for (int i = 0; i < activeZones.Count; i++)
            {
                totalWeight += activeZones.Count - i;
            }

            double currentTotalArea = 0;
            for (int i = 0; i < activeZones.Count; i++)
            {
                var zone = activeZones[i];
                double zoneWeight = activeZones.Count - i;
                double qismArea = floodedAreaKm2 * (zoneWeight / totalWeight);

                if (i == activeZones.Count - 1)
                {
                    qismArea = Math.Max(0, floodedAreaKm2 - currentTotalArea);
                }

                if (qismArea <= 0)
                {
                    continue;
                }

                double cumulativeAreaAfterQism = currentTotalArea + qismArea;
                long qismPop = CalculatePopulationAtRisk(cumulativeAreaAfterQism) - CalculatePopulationAtRisk(currentTotalArea);

                // Use cumulative flooded area for the qism risk band so local breakdown aligns with overall exposure scale.
                string qismRisk = GetInformalSettlementsExposure(cumulativeAreaAfterQism);

                qisms.Add(new QismResult(zone.Name, qismArea, qismPop, qismRisk));
                currentTotalArea = cumulativeAreaAfterQism;
            }
        }

        var atRiskFacilities = AllFacilities
            .Where(f => projectedSeaLevel >= f.ThresholdMm)
            .ToList();

        return new ProjectionResult(
            projectedSeaLevel,
            floodedAreaKm2,
            populationAtRisk,
            riskLevel,
            colorCode,
            riskDescription,
            highRiskAreas,
            informalSettlementsExposure,
            qisms,
            atRiskFacilities
        );
    }
}