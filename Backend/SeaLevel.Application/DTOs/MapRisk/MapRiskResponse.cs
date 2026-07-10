namespace SeaLevel.Application.DTOs.MapRisk;

public class MapRiskResponse
{
    public double ProjectedSeaLevelMm { get; set; }

    public double FloodedAreaKm2 { get; set; }

    public string RiskLevel { get; set; } = string.Empty;

    public string ColorCode { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public List<ZoneThresholdDto> Zones { get; set; } = new();
}
