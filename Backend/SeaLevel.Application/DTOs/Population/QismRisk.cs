namespace SeaLevel.Application.DTOs.Population;

public class QismRisk
{
    public string Name { get; set; } = string.Empty;

    public double FloodedAreaKm2 { get; set; }

    public double ExposedPopulation { get; set; }

    public string RiskLevel { get; set; } = string.Empty;
}
