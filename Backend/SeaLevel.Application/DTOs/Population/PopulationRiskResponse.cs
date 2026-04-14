namespace SeaLevel.Application.DTOs.Population;

public class PopulationRiskResponse
{
    public double TotalPopulation { get; set; }

    public double ExposedPopulation { get; set; }

    public string InformalSettlementsExposure { get; set; } = string.Empty;

    public List<QismRisk> Qisms { get; set; } = new();
}
