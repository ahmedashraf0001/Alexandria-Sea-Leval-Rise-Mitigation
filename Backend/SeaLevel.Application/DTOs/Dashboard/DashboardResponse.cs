namespace SeaLevel.Application.DTOs.Dashboard;

public class DashboardResponse
{
    public double PopulationAtRisk { get; set; }

    public double FloodedAreaKm2 { get; set; }

    public List<string> HighRiskAreas { get; set; } = new();
}
