using SeaLevel.Application.DTOs.Scenarios;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Application.Services.Implementations;

public class ScenariosService : IScenariosService
{
    public IReadOnlyList<ScenarioItem> GetScenarios()
    {
        return new List<ScenarioItem>
        {
            new() { Id = "SSP126", Label = "SSP1-2.6 (متفائل)", Description = "مسار الانبعاثات المنخفضة", EmissionLevel = "low" },
            new() { Id = "SSP245", Label = "SSP2-4.5 (متوسط)", Description = "مسار الانبعاثات المتوسطة", EmissionLevel = "medium" },
            new() { Id = "SSP370", Label = "SSP3-7.0 (مرتفع)", Description = "مسار الانبعاثات المرتفعة", EmissionLevel = "high" },
            new() { Id = "SSP585", Label = "SSP5-8.5 (أسوأ حالة)", Description = "مسار التنمية المعتمد على الوقود الأحفوري", EmissionLevel = "extreme" }
        };
    }
}
