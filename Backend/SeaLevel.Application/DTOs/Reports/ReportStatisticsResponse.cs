namespace SeaLevel.Application.DTOs.Reports;

public class ReportStatisticsResponse
{
    public List<FloodDataItem> FloodData { get; set; } = new();

    public List<PopulationDataItem> PopulationData { get; set; } = new();
}
