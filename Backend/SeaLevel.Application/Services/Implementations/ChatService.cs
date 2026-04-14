using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using SeaLevel.Application.DTOs.Chat;
using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Helpers;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class ChatService : IChatService
{
    private static readonly string[] ScopeKeywords =
    {
        "ssp",
        "scenario",
        "senario",
        "scenerio",
        "selected scenario",
        "chosen scenario",
        "current scenario",
        "current chosen scenario",
        "current selected scenario",
        "sea level",
        "flood",
        "risk",
        "coast",
        "alexandria",
        "population",
        "infrastructure",
        "adaptation",
        "mitigate",
        "mitigation",
        "risk reduction",
        "reduce risk",
        "protect",
        "preparedness",
        "response",
        "resilience",
        "disaster",
        "recovery",
        "evacuation",
        "early warning",
        "سيناريو",
        "سيناريوهات",
        "مستوى البحر",
        "غرق",
        "فيضان",
        "خطر",
        "الإسكندرية",
        "سكان",
        "البنية التحتية",
        "تخفيف",
        "الحد من",
        "تقليل",
        "إجراءات",
        "استجابة",
        "تأهب",
        "حماية",
        "تكي",
        "مرونة",
        "كارثة",
        "تعافي",
        "إخلاء",
        "انذار",
        "إنذار"
    };

    private static readonly string[] GreetingKeywords = { "hello", "hi", "hey", "مرحبا", "اهلا", "أهلا", "السلام" };

    private static readonly (Regex Pattern, string Scenario)[] ScenarioPatterns =
    {
        (new Regex(@"\bssp\s*1\s*[-_/]?\s*2(?:[\.,]\s*6)?\b|\bssp\s*126\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), "SSP126"),
        (new Regex(@"\bssp\s*2\s*[-_/]?\s*4(?:[\.,]\s*5)?\b|\bssp\s*245\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), "SSP245"),
        (new Regex(@"\bssp\s*3\s*[-_/]?\s*7(?:[\.,]\s*0)?\b|\bssp\s*370\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), "SSP370"),
        (new Regex(@"\bssp\s*5\s*[-_/]?\s*8(?:[\.,]\s*5)?\b|\bssp\s*585\b", RegexOptions.IgnoreCase | RegexOptions.Compiled), "SSP585")
    };

    private static readonly Regex SupportedYearRegex =
        new(@"\b(2030|2050|2070|2100)\b", RegexOptions.Compiled);

    private static readonly string[] DetailedAnalysisKeywords =
    {
        "detailed",
        "detail",
        "analysis",
        "analyze",
        "calculation",
        "calculate",
        "equation",
        "compare",
        "comparison",
        "breakdown",
        "step by step",
        "report",
        "plan",
        "تحليل",
        "تفصيل",
        "تفصيلي",
        "احسب",
        "حساب",
        "معادلة",
        "قارن",
        "مقارنة",
        "تقرير",
        "خطة"
    };

    private readonly INasaPowerClient _nasaPowerClient;
    private readonly IMlForecastClient _mlForecastClient;
    private readonly IChatCompletionClient _chatCompletionClient;

    public ChatService(
        INasaPowerClient nasaPowerClient,
        IMlForecastClient mlForecastClient,
        IChatCompletionClient chatCompletionClient)
    {
        _nasaPowerClient = nasaPowerClient;
        _mlForecastClient = mlForecastClient;
        _chatCompletionClient = chatCompletionClient;
    }

    public async Task<IReadOnlyList<ChatMetricItem>> GetMetricsAsync(CancellationToken cancellationToken = default)
    {
        DateTime toDate = DateTime.UtcNow.Date;
        DateTime fromDate = toDate.AddDays(-14);

        List<DailyWeatherRow> weatherRows = (await _nasaPowerClient.GetDailyWeatherAsync(
                fromDate,
                toDate,
                cancellationToken: cancellationToken))
            .OrderBy(row => row.Date)
            .ToList();

        if (weatherRows.Count == 0)
        {
            return Array.Empty<ChatMetricItem>();
        }

        MlForecastResponse forecast = await _mlForecastClient.GetQuickForecastAsync(cancellationToken: cancellationToken);

        double predictedSeaLevel = forecast.Forecast.Count > 0
            ? Math.Round(forecast.Forecast.Last().PredictedSeaLevel, 2)
            : 0.0;

        List<ChatMetricItem> metrics = weatherRows
            .Select(row => new ChatMetricItem
            {
                Date = row.Date,
                WindSpeedMs = Math.Round(row.WS2M, 2),
                TemperatureC = Math.Round(row.T2M, 2),
                RelativeHumidityPct = Math.Round(row.RH2M, 2),
                SeaLevelPressureHpa = Math.Round(row.SLP, 2),
                PredictedSeaLevelMm = predictedSeaLevel,
                Value = predictedSeaLevel
            })
            .ToList();

        return metrics;
    }

    public async Task<ChatResponse> SendMessageAsync(ChatRequest request, CancellationToken cancellationToken = default)
    {
        string scenario = ResolveScenario(request.Context.Scenario, request.Message);
        int year = ResolveYear(request.Context.Year, request.Message);
        bool scenarioFromUserMessage = ExtractScenarioFromMessage(request.Message) is not null;
        bool isArabicMessage = ContainsArabic(request.Message);
        bool currentScenarioAnalysisRequest = IsCurrentScenarioAnalysisRequest(request.Message);
        bool mitigationRequest = IsMitigationRequest(request.Message);

        RiskMappingHelper.ValidateScenario(scenario);
        RiskMappingHelper.ValidateYear(year);

        if (IsGreetingOnly(request.Message))
        {
            return new ChatResponse
            {
                Reply = BuildGreetingReply(isArabicMessage),
                References = Array.Empty<ChatReferenceItem>()
            };
        }

        if (!IsInScopeTopic(request.Message) && !currentScenarioAnalysisRequest)
        {
            return new ChatResponse
            {
                Reply = isArabicMessage
                    ? "أقدر سؤالك. أقدر أساعد فقط في سيناريوهات SSP، مخاطر ارتفاع مستوى البحر، وخطط التعافي من الكوارث في الإسكندرية."
                    : "Thanks for your message. I can only help with SSP scenarios, sea-level risk, and disaster-recovery planning for Alexandria.",
                References = Array.Empty<ChatReferenceItem>()
            };
        }

        bool detailedAnalysisRequested =
            IsDetailedAnalysisRequested(request.Message) ||
            currentScenarioAnalysisRequest ||
            mitigationRequest;

        DateTime toDate = DateTime.UtcNow.Date;
        DateTime fromDate = toDate.AddDays(-14);

        IEnumerable<DailyWeatherRow> weatherRows = await _nasaPowerClient.GetDailyWeatherAsync(
            fromDate,
            toDate,
            cancellationToken: cancellationToken);

        List<DailyWeatherRow> weatherRowsList = weatherRows.ToList();

        MlForecastResponse forecast = await _mlForecastClient.GetForecastAsync(
            weatherRowsList,
            cancellationToken: cancellationToken);

        List<double> forecastSeries = forecast.Forecast
            .Select(point => point.PredictedSeaLevel)
            .ToList();

        double basePredictedSeaLevel = RiskMappingHelper.GetBasePredictedSeaLevel(forecast);
        double adjustedPredictedSeaLevel = RiskMappingHelper.ApplyScenarioAndYearAdjustment(
            basePredictedSeaLevel,
            scenario,
            year);
        double delta = adjustedPredictedSeaLevel - basePredictedSeaLevel;

        ProjectionResult projection = ProjectionEngine.Calculate(adjustedPredictedSeaLevel);
        string riskLevel = projection.RiskLevel;
        string riskDescription = projection.RiskDescription;
        string colorCode = projection.ColorCode;
        double floodedAreaKm2 = projection.FloodedAreaKm2;
        double exposedPopulation = projection.PopulationAtRisk;
        string informalSettlementExposure = projection.InformalSettlementsExposure;
        IReadOnlyList<string> highRiskAreas = projection.HighRiskAreas;
        IReadOnlyList<QismResult> qismBreakdown = projection.Qisms;
        IReadOnlyList<InfrastructureFacility> atRiskFacilities = projection.AtRiskFacilities;
        double totalPopulation = Math.Round(5_500_000 + ((year - 2030) / 20.0 * 350_000), 0);
        double protectedPopulation = Math.Max(0.0, totalPopulation - exposedPopulation);

        double minForecast = forecastSeries.Min();
        double maxForecast = forecastSeries.Max();
        double meanForecast = forecastSeries.Average();
        double trendDelta = forecastSeries.Count > 1 ? forecastSeries[^1] - forecastSeries[0] : 0.0;

        List<ChatReferenceItem> references = BuildReferenceSet(
            scenario,
            year,
            fromDate,
            toDate,
            weatherRowsList.Count,
            basePredictedSeaLevel,
            delta,
            adjustedPredictedSeaLevel,
            riskLevel,
            riskDescription,
            colorCode,
            floodedAreaKm2,
            exposedPopulation,
            totalPopulation,
            protectedPopulation,
            informalSettlementExposure,
            highRiskAreas,
            qismBreakdown,
            atRiskFacilities,
            forecast.HorizonDays,
            forecast.InputLastDate,
            forecastSeries.Count,
            minForecast,
            maxForecast,
            meanForecast,
            trendDelta);

        string userPrompt = BuildContextualPrompt(
            request.Message,
            scenario,
            year,
            fromDate,
            toDate,
            weatherRowsList.Count,
            basePredictedSeaLevel,
            delta,
            adjustedPredictedSeaLevel,
            riskLevel,
            riskDescription,
            colorCode,
            floodedAreaKm2,
            exposedPopulation,
            totalPopulation,
            protectedPopulation,
            informalSettlementExposure,
            highRiskAreas,
            qismBreakdown,
            atRiskFacilities,
            forecast.HorizonDays,
            forecast.InputLastDate,
            forecastSeries.Count,
            minForecast,
            maxForecast,
            meanForecast,
            trendDelta,
            scenarioFromUserMessage,
            isArabicMessage,
            detailedAnalysisRequested,
            references);

        string reply;

        try
        {
            reply = await _chatCompletionClient.GetChatCompletionAsync(
                BuildSystemPrompt(),
                userPrompt,
                cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            string note = isArabicMessage
                ? $"> ملاحظة: تعذر استخدام Groq حالياً ({exception.Message}). تم عرض تحليل احتياطي مبني على الحسابات الحالية."
                : $"> Note: Groq is not available right now ({exception.Message}). A deterministic fallback analysis is shown.";

            reply = note + Environment.NewLine + Environment.NewLine + BuildFallbackReply(
                scenario,
                year,
                adjustedPredictedSeaLevel,
                riskLevel,
                floodedAreaKm2,
                exposedPopulation,
                highRiskAreas,
                isArabicMessage,
                detailedAnalysisRequested);
        }
        catch (Exception exception)
        {
            string errorHint = ShortError(exception.Message);
            string note = isArabicMessage
                ? $"> ملاحظة: تعذر الوصول إلى Groq حالياً ({errorHint}). تم عرض تحليل احتياطي مبني على الحسابات الحالية."
                : $"> Note: Groq is temporarily unavailable ({errorHint}). A deterministic fallback analysis is shown.";

            reply = note + Environment.NewLine + Environment.NewLine + BuildFallbackReply(
                scenario,
                year,
                adjustedPredictedSeaLevel,
                riskLevel,
                floodedAreaKm2,
                exposedPopulation,
                highRiskAreas,
                isArabicMessage,
                detailedAnalysisRequested);
        }

        return new ChatResponse
        {
            Reply = reply,
            References = references
        };
    }

    private static string BuildSystemPrompt()
    {
        return """
You are the Alexandria Sea-Level Smart Assistant.

MISSION AND DOMAIN LIMITS
- You must ONLY answer questions related to SSP scenarios, sea-level rise, flood risk, infrastructure exposure, adaptation, emergency preparedness, and disaster recovery for Alexandria.
- If a question is outside this domain, refuse briefly and redirect the user to SSP/disaster-recovery topics.
- Treat "current/chosen/selected scenario" requests as in-domain SSP questions.
- If the user does not explicitly name an SSP code, use Scenario and Year from ANALYSIS_CONTEXT as the active selection.
- Treat follow-up mitigation questions (for example: "how can we mitigate that") as in-domain and interpret "that/this" as the current ANALYSIS_CONTEXT risk state.

GROUNDING REQUIREMENTS
- Use only the values and references supplied in ANALYSIS_CONTEXT and REFERENCE_CATALOG.
- Do not fabricate values, formulas, datasets, years, or source names.
- If data is unavailable in context, say so clearly.
- Keep units explicit (mm, km2, people, days).
- When mentioning a parameter, explain briefly how it was calculated using PARAMETER_CALCULATION_GUIDE.

STYLE RULES
- Do not use rigid report headers unless ANALYSIS_MODE is DETAILED.
- If ANALYSIS_MODE is STANDARD, answer as a natural chatbot in short paragraphs.
- If ANALYSIS_MODE is DETAILED, provide:
    1) Situation summary
    2) Key calculations with equation and intermediate values
    3) Disaster recovery actions for immediate (0-72h), short-term (3-30d), and medium-long term (30+d)
- If the question is out of scope, refuse briefly and redirect. Do not provide calculations.
- Never say a question is out of scope and then continue with full analysis.
- For risk, mitigation, adaptation, or recovery questions, include a compact computed snapshot with exact values from ANALYSIS_CONTEXT.
- Tie mitigation actions to backend-calculated risk parameters (sea level, flooded area, exposed population, affected areas/facilities).

MARKDOWN FORMAT
- Always return valid Markdown.
- Use clear `##` headings and bullet lists.
- Put formulas/equations in fenced code blocks.
- If ANALYSIS_MODE is DETAILED, include sections in this order (in user language):
    1) Situation summary
    2) Key calculations
    3) Computed parameters snapshot
    4) Disaster recovery actions
    5) References (only for IDs you used)
- If ANALYSIS_MODE is STANDARD, keep the response concise with one heading and short bullets.

REFERENCES
- Cite reference IDs only when you used them, like [R1].
- For short greeting-like answers, references are not required.

LANGUAGE
- Reply in the same language used by the user message.
- If USER_LANGUAGE is ARABIC, respond in Arabic only and do not include any other language except scenario codes and units.
- Never include Chinese or mixed-language fragments.
""";
    }

    private static string BuildContextualPrompt(
        string userMessage,
        string scenario,
        int year,
        DateTime fromDate,
        DateTime toDate,
        int weatherRowsCount,
        double basePredictedSeaLevel,
        double delta,
        double adjustedPredictedSeaLevel,
        string riskLevel,
        string riskDescription,
        string colorCode,
        double floodedAreaKm2,
        double exposedPopulation,
        double totalPopulation,
        double protectedPopulation,
        string informalSettlementExposure,
        IReadOnlyList<string> highRiskAreas,
        IReadOnlyList<QismResult> qismBreakdown,
        IReadOnlyList<InfrastructureFacility> atRiskFacilities,
        int horizonDays,
        string inputLastDate,
        int forecastPointCount,
        double minForecast,
        double maxForecast,
        double meanForecast,
        double trendDelta,
        bool scenarioFromUserMessage,
        bool isArabicMessage,
        bool detailedAnalysisRequested,
        IReadOnlyList<ChatReferenceItem> references)
    {
        StringBuilder builder = new();

        builder.AppendLine("USER_QUESTION:");
        builder.AppendLine(userMessage.Trim());
        builder.AppendLine();
        builder.AppendLine("ANALYSIS_CONTEXT:");
        builder.AppendLine($"- ANALYSIS_MODE: {(detailedAnalysisRequested ? "DETAILED" : "STANDARD")}");
        builder.AppendLine($"- USER_LANGUAGE: {(isArabicMessage ? "ARABIC" : "ENGLISH_OR_OTHER")}");
        builder.AppendLine($"- Scenario: {scenario}");
        builder.AppendLine($"- Scenario source: {(scenarioFromUserMessage ? "USER_MESSAGE" : "UI_CONTEXT")}");
        builder.AppendLine($"- Year: {year}");
        builder.AppendLine("- Active selection rule: when user asks about current/chosen/selected scenario, use Scenario and Year above.");
        builder.AppendLine("- Follow-up rule: pronouns like that/this refer to this active scenario-year risk context.");
        builder.AppendLine($"- Weather window (UTC): {fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd}");
        builder.AppendLine($"- Weather observations used: {weatherRowsCount}");
        builder.AppendLine($"- Forecast points returned: {forecastPointCount}");
        builder.AppendLine($"- Forecast horizon days: {horizonDays}");
        builder.AppendLine($"- Forecast input last date: {inputLastDate}");
        builder.AppendLine($"- Base predicted sea level (mm): {Format(basePredictedSeaLevel)}");
        builder.AppendLine($"- Combined scenario-year delta (mm): {Format(delta, 3)}");
        builder.AppendLine("- Delta source: ProjectionEngine IPCC scenario-year lookup table.");
        builder.AppendLine($"- Equation: adjustedSeaLevelMm = baseSeaLevelMm + delta");
        builder.AppendLine($"- Adjusted predicted sea level (mm): {Format(adjustedPredictedSeaLevel)}");
        builder.AppendLine("- Risk thresholds (ProjectionEngine.GetRiskInfo): <2300=منخفض, <=2500=متوسط, <=2700=مرتفع, <=2900=مرتفع جدًا, <=3100=شديد, >3100=كارثي");
        builder.AppendLine($"- Risk level: {riskLevel}");
        builder.AppendLine($"- Risk description: {riskDescription}");
        builder.AppendLine($"- Risk color code: {colorCode}");
        builder.AppendLine($"- Flooded area equation: piecewise model from ProjectionEngine.CalculateFloodedAreaKm2(seaLevelMm)");
        builder.AppendLine($"- Flooded area branch used: {GetFloodedAreaBranchFormula(adjustedPredictedSeaLevel)}");
        builder.AppendLine($"- Flooded area (km2): {Format(floodedAreaKm2)}");
        builder.AppendLine($"- Exposed population equation: tranche-density model from ProjectionEngine.CalculatePopulationAtRisk(floodedAreaKm2)");
        builder.AppendLine($"- Exposed population tranche breakdown: {GetPopulationTrancheBreakdown(floodedAreaKm2)}");
        builder.AppendLine($"- Exposed population (people): {Format(exposedPopulation, 0)}");
        builder.AppendLine($"- Total population projection (people): {Format(totalPopulation, 0)}");
        builder.AppendLine($"- Protected population (people): {Format(protectedPopulation, 0)}");
        builder.AppendLine($"- Informal settlements exposure: {informalSettlementExposure}");
        builder.AppendLine($"- High-risk areas from zone-threshold exceedance: {string.Join(", ", highRiskAreas)}");
        builder.AppendLine($"- Qism exposure breakdown: {FormatQismBreakdown(qismBreakdown)}");
        builder.AppendLine($"- At-risk facilities breakdown: {FormatFacilityBreakdown(atRiskFacilities)}");
        builder.AppendLine($"- Forecast summary (mm): min={Format(minForecast)}, max={Format(maxForecast)}, mean={Format(meanForecast)}, trendDelta={Format(trendDelta)}");
        builder.AppendLine("- Demo dataset note: frontend predictions dataset is demo-only and not an official forecast.");
        builder.AppendLine();
        builder.AppendLine("PARAMETER_CALCULATION_GUIDE:");
        builder.AppendLine(BuildParameterCalculationGuide(year, adjustedPredictedSeaLevel, floodedAreaKm2));
        builder.AppendLine();
        builder.AppendLine("REFERENCE_CATALOG:");

        foreach (ChatReferenceItem reference in references)
        {
            builder.AppendLine($"- [{reference.Id}] {reference.Title}: {reference.Detail}");
        }

        return builder.ToString();
    }

    private static string BuildFallbackReply(
        string scenario,
        int year,
        double adjustedPredictedSeaLevel,
        string riskLevel,
        double floodedAreaKm2,
        double exposedPopulation,
        IReadOnlyList<string> highRiskAreas,
        bool isArabic,
        bool detailedAnalysisRequested)
    {
        string areas = highRiskAreas.Count > 0
            ? string.Join(", ", highRiskAreas)
            : isArabic ? "غير متاح" : "Not available";

        if (isArabic)
        {
            if (!detailedAnalysisRequested)
            {
                return $"""
## ملخص سريع
- السيناريو: {scenario} ({year})
- مستوى سطح البحر المتوقع: {Format(adjustedPredictedSeaLevel)} مم
- مستوى المخاطر: {riskLevel}
- المساحة المغمورة المقدرة: {Format(floodedAreaKm2)} كم2
- السكان المعرضون للخطر: {Format(exposedPopulation, 0)} شخص
- مناطق الأولوية: {areas}
""";
            }

            return $"""
## ملخص الوضع
- السيناريو: {scenario} ({year})
- مستوى سطح البحر المتوقع: {Format(adjustedPredictedSeaLevel)} مم
- مستوى المخاطر: {riskLevel}

## الحسابات الرئيسية
```text
adjustedSeaLevelMm = baseSeaLevelMm + delta
floodedAreaKm2 = ProjectionEngine.CalculateFloodedAreaKm2(adjustedSeaLevelMm)
populationAtRisk = ProjectionEngine.CalculatePopulationAtRisk(floodedAreaKm2)
```
- المساحة المغمورة المقدرة: {Format(floodedAreaKm2)} كم2
- السكان المعرضون للخطر: {Format(exposedPopulation, 0)} شخص

## إجراءات الاستجابة والتعافي
- فوري (0-72 ساعة): تفعيل الإنذار المبكر وإبلاغ السكان في مناطق الأولوية: {areas}.
- قصير الأمد (3-30 يوم): حماية المرافق الحرجة وتحسين تصريف المياه وخطط الإيواء.
- متوسط وطويل الأمد (30+ يوم): تعزيز البنية التحتية الساحلية ودمج المخاطر في التخطيط العمراني.

## المراجع
- [R3] فرق السيناريو-السنة من جدول IPCC
- [R4] معادلة الضبط
- [R5] معادلة التعديل وحدود مستوى المخاطر
- [R6] تقدير المساحة المغمورة
- [R7] تقدير السكان المعرضين للخطر
- [R8] مناطق الأولوية عالية المخاطر
""";
        }

        if (!detailedAnalysisRequested)
        {
            return $"""
## Quick Summary
- Scenario: {scenario} ({year})
- Predicted sea level: {Format(adjustedPredictedSeaLevel)} mm
- Risk level: {riskLevel}
- Estimated flooded area: {Format(floodedAreaKm2)} km2
- Exposed population: {Format(exposedPopulation, 0)} people
- Priority areas: {areas}
""";
        }

        return $"""
## Situation Summary
- Scenario: {scenario} ({year})
- Predicted sea level: {Format(adjustedPredictedSeaLevel)} mm
- Risk level: {riskLevel}

## Key Calculations
```text
adjustedSeaLevelMm = baseSeaLevelMm + delta
floodedAreaKm2 = ProjectionEngine.CalculateFloodedAreaKm2(adjustedSeaLevelMm)
populationAtRisk = ProjectionEngine.CalculatePopulationAtRisk(floodedAreaKm2)
```
- Estimated flooded area: {Format(floodedAreaKm2)} km2
- Exposed population: {Format(exposedPopulation, 0)} people

## Recovery Actions
- Immediate (0-72h): trigger early warning and alert residents in priority areas: {areas}.
- Short-term (3-30d): protect critical infrastructure, improve drainage, and prepare shelter/logistics.
- Medium/Long-term (30+d): reinforce coastal defenses and integrate risk into urban planning.

## References
- [R3] Scenario-year delta from IPCC table
- [R4] Adjustment equation
- [R5] Adjusted sea-level equation and risk thresholds
- [R6] Flooded area estimate
- [R7] Population exposure estimate
- [R8] High-risk area lookup
""";
    }

    private static string BuildGreetingReply(bool isArabic)
    {
        return isArabic
            ? "مرحباً! أنا مساعد مخاطر ارتفاع البحر في الإسكندرية. اسألني عن سيناريو SSP وسنة محددة أو عن خطة تعافٍ مناسبة."
            : "Hello! I can help with Alexandria SSP sea-level risk and disaster-recovery planning. Ask me about a scenario/year or a recovery plan.";
    }

    private static List<ChatReferenceItem> BuildReferenceSet(
        string scenario,
        int year,
        DateTime fromDate,
        DateTime toDate,
        int weatherRowsCount,
        double basePredictedSeaLevel,
        double delta,
        double adjustedPredictedSeaLevel,
        string riskLevel,
        string riskDescription,
        string colorCode,
        double floodedAreaKm2,
        double exposedPopulation,
        double totalPopulation,
        double protectedPopulation,
        string informalSettlementExposure,
        IReadOnlyList<string> highRiskAreas,
        IReadOnlyList<QismResult> qismBreakdown,
        IReadOnlyList<InfrastructureFacility> atRiskFacilities,
        int horizonDays,
        string inputLastDate,
        int forecastPointCount,
        double minForecast,
        double maxForecast,
        double meanForecast,
        double trendDelta)
    {
        return
        [
            new ChatReferenceItem
            {
                Id = "R1",
                Title = "NASA POWER weather context",
                Detail = $"Window {fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd}, records={weatherRowsCount}, parameters=WS2M,T2M,RH2M,PS,SLP,WD2M"
            },
            new ChatReferenceItem
            {
                Id = "R2",
                Title = "ML forecast output",
                Detail = $"points={forecastPointCount}, horizonDays={horizonDays}, inputLastDate={inputLastDate}, min={Format(minForecast)} mm, max={Format(maxForecast)} mm, mean={Format(meanForecast)} mm, trendDelta={Format(trendDelta)} mm"
            },
            new ChatReferenceItem
            {
                Id = "R3",
                Title = "Scenario-year delta (IPCC lookup)",
                Detail = $"scenario={scenario}, year={year}, delta={Format(delta, 3)} mm from ProjectionEngine scenario-year table"
            },
            new ChatReferenceItem
            {
                Id = "R4",
                Title = "Adjustment method",
                Detail = $"adjustedSeaLevelMm = baseSeaLevelMm + delta"
            },
            new ChatReferenceItem
            {
                Id = "R5",
                Title = "Adjusted sea-level equation and risk band",
                Detail = $"adjustedSeaLevelMm={Format(basePredictedSeaLevel)} + {Format(delta, 3)} = {Format(adjustedPredictedSeaLevel)} mm; thresholds: <2300=منخفض, <=2500=متوسط, <=2700=مرتفع, <=2900=مرتفع جدًا, <=3100=شديد, >3100=كارثي; risk={riskLevel}; description={riskDescription}; color={colorCode}"
            },
            new ChatReferenceItem
            {
                Id = "R6",
                Title = "Flooded area estimate",
                Detail = $"ProjectionEngine.CalculateFloodedAreaKm2(piecewise) => {Format(floodedAreaKm2)} km2"
            },
            new ChatReferenceItem
            {
                Id = "R7",
                Title = "Population exposure estimate",
                Detail = $"ProjectionEngine.CalculatePopulationAtRisk(tranche-density) => exposed={Format(exposedPopulation, 0)} people, total={Format(totalPopulation, 0)} people, protected={Format(protectedPopulation, 0)} people; informalExposure={informalSettlementExposure}"
            },
            new ChatReferenceItem
            {
                Id = "R8",
                Title = "High-risk areas threshold exceedance",
                Detail = $"Areas where adjustedSeaLevelMm >= zoneThresholdMm in ProjectionEngine unified zones (baseline zones + facility districts with min threshold) => {string.Join(", ", highRiskAreas)}"
            },
            new ChatReferenceItem
            {
                Id = "R10",
                Title = "Qism exposure breakdown",
                Detail = $"Method: build active zones from unified thresholds; qismArea=floodedAreaKm2*(zoneWeight/totalWeight) with zoneWeight=(activeZonesCount-index) and last zone taking remaining area; qismPopulation=PopulationAtRisk(cumulative+qismArea)-PopulationAtRisk(cumulative); qismRisk=InformalExposure(cumulative+qismArea). Result: {FormatQismBreakdown(qismBreakdown)}"
            },
            new ChatReferenceItem
            {
                Id = "R11",
                Title = "At-risk facilities breakdown",
                Detail = $"Method: include facilities where adjustedSeaLevelMm >= facilityThresholdMm; floodDepthMeters=max(0,(adjustedSeaLevelMm-thresholdMm)/1000). Result: {FormatFacilityBreakdown(atRiskFacilities)}"
            },
            new ChatReferenceItem
            {
                Id = "R9",
                Title = "Frontend demo dataset note",
                Detail = "predictions.json is marked as demo-only and not an official forecast source."
            }
        ];
    }

    private static bool IsInScopeTopic(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return false;
        }

        string lowered = message.ToLowerInvariant();
        return ScopeKeywords.Any(keyword => lowered.Contains(keyword));
    }

    private static bool IsGreetingOnly(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return false;
        }

        string lowered = message.ToLowerInvariant().Trim();
        bool hasGreeting = GreetingKeywords.Any(greeting => lowered.Contains(greeting));
        bool hasScopeKeyword = ScopeKeywords.Any(keyword => lowered.Contains(keyword));

        if (!hasGreeting || hasScopeKeyword)
        {
            return false;
        }

        int wordCount = lowered
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Length;

        return wordCount <= 5;
    }

    private static bool IsDetailedAnalysisRequested(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return false;
        }

        string lowered = message.ToLowerInvariant();
        return DetailedAnalysisKeywords.Any(keyword => lowered.Contains(keyword));
    }

    private static bool IsCurrentScenarioAnalysisRequest(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return false;
        }

        string lowered = message.ToLowerInvariant();

        bool asksForAnalysis =
            lowered.Contains("full analysis") ||
            lowered.Contains("full report") ||
            lowered.Contains("analysis") ||
            lowered.Contains("analyze") ||
            lowered.Contains("summary") ||
            lowered.Contains("overview") ||
            lowered.Contains("تحليل") ||
            lowered.Contains("تفصيل") ||
            lowered.Contains("تقرير") ||
            lowered.Contains("ملخص");

        bool referencesCurrentSelection =
            lowered.Contains("scenario") ||
            lowered.Contains("senario") ||
            lowered.Contains("scenerio") ||
            lowered.Contains("selected scenario") ||
            lowered.Contains("chosen scenario") ||
            lowered.Contains("current scenario") ||
            lowered.Contains("current chosen") ||
            lowered.Contains("current selected") ||
            lowered.Contains("السيناريو") ||
            lowered.Contains("سيناريو") ||
            lowered.Contains("الحالي") ||
            lowered.Contains("المختار") ||
            lowered.Contains("المحدد");

        return asksForAnalysis && referencesCurrentSelection;
    }

    private static bool IsMitigationRequest(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return false;
        }

        string lowered = message.ToLowerInvariant();
        return
            lowered.Contains("mitigate") ||
            lowered.Contains("mitigation") ||
            lowered.Contains("adaptation") ||
            lowered.Contains("recovery") ||
            lowered.Contains("preparedness") ||
            lowered.Contains("تخفيف") ||
            lowered.Contains("الحد من") ||
            lowered.Contains("تقليل") ||
            lowered.Contains("تكي") ||
            lowered.Contains("تعافي") ||
            lowered.Contains("تأهب");
    }

    private static string ResolveScenario(string contextScenario, string userMessage)
    {
        string? scenarioFromMessage = ExtractScenarioFromMessage(userMessage);
        if (!string.IsNullOrWhiteSpace(scenarioFromMessage))
        {
            return scenarioFromMessage;
        }

        string? normalizedContext = NormalizeScenarioCode(contextScenario);
        return string.IsNullOrWhiteSpace(normalizedContext) ? "SSP245" : normalizedContext;
    }

    private static int ResolveYear(string contextYear, string userMessage)
    {
        int? yearFromMessage = ExtractYearFromMessage(userMessage);
        if (yearFromMessage.HasValue)
        {
            return yearFromMessage.Value;
        }

        return int.TryParse(contextYear, out int parsedYear) ? parsedYear : 2050;
    }

    private static string? ExtractScenarioFromMessage(string message)
    {
        return NormalizeScenarioCode(message);
    }

    private static string? NormalizeScenarioCode(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        foreach ((Regex pattern, string scenario) in ScenarioPatterns)
        {
            if (pattern.IsMatch(text))
            {
                return scenario;
            }
        }

        return null;
    }

    private static int? ExtractYearFromMessage(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return null;
        }

        Match match = SupportedYearRegex.Match(message);
        if (!match.Success)
        {
            return null;
        }

        return int.TryParse(match.Value, out int year) ? year : null;
    }

    private static bool ContainsArabic(string text)
    {
        return text.Any(character => character is >= '\u0600' and <= '\u06FF');
    }

    private static string ShortError(string message)
    {
        if (string.IsNullOrWhiteSpace(message))
        {
            return "No error details";
        }

        string singleLine = message
            .Replace("\r", " ")
            .Replace("\n", " ")
            .Trim();

        if (singleLine.Length <= 180)
        {
            return singleLine;
        }

        return singleLine[..180] + "...";
    }

    private static string Format(double value, int decimals = 2)
    {
        return value.ToString($"F{decimals}", CultureInfo.InvariantCulture);
    }

    private static string BuildParameterCalculationGuide(
        int year,
        double adjustedPredictedSeaLevel,
        double floodedAreaKm2)
    {
        return string.Join(Environment.NewLine,
        [
            "- basePredictedSeaLevelMm = last predicted value in ML forecast series.",
            "- delta (mm) comes from ProjectionEngine base year deltas (2030:50, 2050:120, 2070:180, 2100:280) multiplied by scenario multipliers: SSP126=1.0, SSP245=1.24, SSP370=1.47, SSP585=1.91.",
            "- adjustedSeaLevelMm = basePredictedSeaLevelMm + delta.",
            "- floodedAreaKm2 uses ProjectionEngine piecewise model: <2200=>0; <=2400=>(sea-2200)*0.010; <=2600=>2+(sea-2400)*0.040; <=2800=>10+(sea-2600)*0.090; <=3000=>28+(sea-2800)*0.160; >3000=>min(60+(sea-3000)*0.200,180).",
            $"- Current flooded-area branch: {GetFloodedAreaBranchFormula(adjustedPredictedSeaLevel)}",
            "- populationAtRisk uses tranche-density model: first 5km2@8000/km2, next 10km2@12000/km2, next 20km2@18000/km2, next 35km2@22000/km2, remaining@25000/km2.",
            $"- Current population tranche breakdown: {GetPopulationTrancheBreakdown(floodedAreaKm2)}",
            "- riskLevel and riskDescription are from ProjectionEngine.GetRiskInfo: <2300=منخفض, <=2500=متوسط, <=2700=مرتفع, <=2900=مرتفع جدًا, <=3100=شديد, >3100=كارثي.",
            $"- totalPopulation = 5,500,000 + (({year} - 2030) / 20.0 * 350,000).",
            "- protectedPopulation = max(0, totalPopulation - exposedPopulation).",
            "- informalSettlementsExposure by floodedAreaKm2: <5=منخفض, <=15=متوسط, <=35=مرتفع, <=70=شديد, >70=كارثي.",
            "- highRiskAreas = zones where adjustedSeaLevelMm >= zone threshold in ProjectionEngine unified zones (baseline zones + facility districts with minimum district threshold).",
            "- qismBreakdown: activeZones=unifiedZones where adjustedSeaLevelMm >= threshold; qismArea=floodedAreaKm2*(zoneWeight/totalWeight) with zoneWeight=(activeZonesCount-index) and last zone taking remaining area; qismPopulation=PopulationAtRisk(cumulative+qismArea)-PopulationAtRisk(cumulative); qismRisk=InformalExposure(cumulative+qismArea).",
            "- atRiskFacilities = facilities where adjustedSeaLevelMm >= facilityThresholdMm; floodDepthMeters=max(0,(adjustedSeaLevelMm-thresholdMm)/1000).",
            "- forecast summary metrics: min=min(forecastSeries), max=max(forecastSeries), mean=average(forecastSeries), trendDelta=last-first."
        ]);
    }

    private static string GetFloodedAreaBranchFormula(double seaLevelMm)
    {
        if (seaLevelMm < 2200)
        {
            return "seaLevelMm < 2200 => floodedAreaKm2 = 0";
        }

        if (seaLevelMm <= 2400)
        {
            return "2200 <= seaLevelMm <= 2400 => floodedAreaKm2 = (seaLevelMm - 2200) * 0.010";
        }

        if (seaLevelMm <= 2600)
        {
            return "2400 < seaLevelMm <= 2600 => floodedAreaKm2 = 2.0 + (seaLevelMm - 2400) * 0.040";
        }

        if (seaLevelMm <= 2800)
        {
            return "2600 < seaLevelMm <= 2800 => floodedAreaKm2 = 10.0 + (seaLevelMm - 2600) * 0.090";
        }

        if (seaLevelMm <= 3000)
        {
            return "2800 < seaLevelMm <= 3000 => floodedAreaKm2 = 28.0 + (seaLevelMm - 2800) * 0.160";
        }

        return "seaLevelMm > 3000 => floodedAreaKm2 = min(60.0 + (seaLevelMm - 3000) * 0.200, 180.0)";
    }

    private static string GetPopulationTrancheBreakdown(double floodedAreaKm2)
    {
        (double ThresholdKm2, double DensityPerKm2)[] tranches =
        [
            (5.0, 8_000),
            (15.0, 12_000),
            (35.0, 18_000),
            (70.0, 22_000),
            (double.MaxValue, 25_000)
        ];

        double remaining = Math.Max(0, floodedAreaKm2);
        double previousThreshold = 0;
        List<string> parts = new();

        foreach ((double threshold, double density) in tranches)
        {
            if (remaining <= 0)
            {
                break;
            }

            double capacity = threshold - previousThreshold;
            double trancheArea = threshold == double.MaxValue
                ? remaining
                : Math.Min(remaining, capacity);

            if (trancheArea <= 0)
            {
                previousThreshold = threshold;
                continue;
            }

            double population = trancheArea * density;
            parts.Add($"{Format(trancheArea)}km2*{Format(density, 0)}/km2={Format(population, 0)} people");

            remaining -= trancheArea;
            previousThreshold = threshold;
        }

        return parts.Count == 0 ? "0 km2 => 0 people" : string.Join("; ", parts);
    }

    private static string FormatQismBreakdown(IReadOnlyList<QismResult> qisms)
    {
        if (qisms.Count == 0)
        {
            return "No qism-level exposure in current projection.";
        }

        return string.Join(
            "; ",
            qisms.Select(qism =>
                $"{qism.Name}: area={Format(qism.FloodedAreaKm2)} km2, exposedPopulation={qism.ExposedPopulation}, risk={qism.RiskLevel}"));
    }

    private static string FormatFacilityBreakdown(IReadOnlyList<InfrastructureFacility> facilities)
    {
        if (facilities.Count == 0)
        {
            return "No infrastructure facilities exceed flood threshold in current projection.";
        }

        var byType = facilities
            .GroupBy(facility => facility.Type)
            .Select(group => $"{group.Key}={group.Count()}")
            .ToList();

        string topFacilities = string.Join(
            "; ",
            facilities
                .Take(6)
                .Select(facility =>
                    $"{facility.Name} ({facility.Type}, {facility.District}, threshold={Format(facility.ThresholdMm)} mm, impact={facility.Impact})"));

        return $"count={facilities.Count}; byType=[{string.Join(", ", byType)}]; top=[{topFacilities}]";
    }
}
