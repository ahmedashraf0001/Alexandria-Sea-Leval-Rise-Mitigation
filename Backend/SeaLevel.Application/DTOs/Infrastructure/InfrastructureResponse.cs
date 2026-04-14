using System.Collections.Generic;

namespace SeaLevel.Application.DTOs.Infrastructure;

public class InfrastructureResponse
{
    public Dictionary<string, List<FacilityItem>> Categories { get; set; } = new();
    public List<InfrastructureFacilityDto> Facilities { get; set; } = new();
}

public class InfrastructureFacilityDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string TypeLabel { get; set; } = string.Empty;
    public string Qism { get; set; } = string.Empty;
    public double Lat { get; set; }
    public double Lng { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
    public string RiskLabel { get; set; } = string.Empty;
    public string FloodDepth { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
