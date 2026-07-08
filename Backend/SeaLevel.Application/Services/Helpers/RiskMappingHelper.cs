using SeaLevel.Application.DTOs.Forecast;

namespace SeaLevel.Application.Services.Helpers;

public static class RiskMappingHelper
{
    private static readonly HashSet<string> SupportedScenarios = new(StringComparer.OrdinalIgnoreCase)
    {
        "SSP126",
        "SSP245",
        "SSP370",
        "SSP585"
    };

    private static readonly HashSet<int> SupportedYears = new() { 2030, 2050, 2070, 2100 };

    public static void ValidateScenario(string scenario)
    {
        if (string.IsNullOrWhiteSpace(scenario) || !SupportedScenarios.Contains(scenario))
        {
            throw new ArgumentException("Scenario must be one of: SSP126, SSP245, SSP370, SSP585.");
        }
    }

    public static void ValidateYear(int year)
    {
        if (!SupportedYears.Contains(year))
        {
            throw new ArgumentException("Year must be one of: 2030, 2050, 2070, 2100.");
        }
    }

    public static double GetBasePredictedSeaLevel(MlForecastResponse response)
    {
        if (response.Forecast.Count == 0)
        {
            throw new InvalidOperationException("ML API returned an empty forecast.");
        }

        return response.Forecast.Max(e => e.PredictedSeaLevel);
    }

    public static double ApplyScenarioAndYearAdjustment(double predictedSeaLevel, string scenario, int year)
    {
        ValidateScenario(scenario);
        ValidateYear(year);

        return ProjectionEngine.GetProjectedSeaLevel(predictedSeaLevel, scenario, year);
    }

    public static string GetRiskLevel(double predictedSeaLevel)
    {
        return ProjectionEngine.Calculate(predictedSeaLevel).RiskLevel;
    }

    public static string GetColorCode(double predictedSeaLevel)
    {
        return ProjectionEngine.Calculate(predictedSeaLevel).ColorCode;
    }

    public static string GetRiskDescription(string riskLevel)
    {
        if (riskLevel == "منخفض") return "تأثير محدود";
        if (riskLevel == "متوسط") return "خطر متزايد";
        if (riskLevel == "مرتفع") return "تهديد للبنية التحتية";
        if (riskLevel == "مرتفع جدًا") return "تغلغل المياه";
        if (riskLevel == "شديد") return "غرق مناطق قديمة";
        return "اختفاء معالم رئيسية";
    }

    public static double GetFloodedAreaKm2(double predictedSeaLevel)
    {
        return ProjectionEngine.Calculate(predictedSeaLevel).FloodedAreaKm2;
    }

    public static double GetPopulationAtRisk(double predictedSeaLevel)
    {
        return ProjectionEngine.Calculate(predictedSeaLevel).PopulationAtRisk;
    }

    public static string GetInformalSettlementExposure(string riskLevel)
    {
        if (riskLevel == "منخفض") return "منخفض";
        if (riskLevel == "متوسط") return "متوسط";
        if (riskLevel == "مرتفع") return "مرتفع";
        if (riskLevel == "مرتفع جدًا" || riskLevel == "شديد") return "شديد";
        return "كارثي";
    }

    public static List<string> GetHighRiskAreas(string riskLevel)
    {
        return new List<string> { "Al Gomrok", "Dekheila", "Anfoushi" };
    }
}
