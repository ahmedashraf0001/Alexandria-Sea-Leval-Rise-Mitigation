namespace SeaLevel.Application.DTOs.Queries;

public class InfrastructureQuery : ScenarioYearQuery
{
    public string? Sectors { get; set; }

    public string? Risks { get; set; }
}
