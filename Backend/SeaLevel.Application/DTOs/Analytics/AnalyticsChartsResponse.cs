namespace SeaLevel.Application.DTOs.Analytics;

public class AnalyticsChartsResponse
{
    public List<HousingDataItem> HousingData { get; set; } = new();

    public List<ExposureDataItem> ExposureData { get; set; } = new();

    public double VulnerabilityIndex { get; set; }

    public string VulnerabilityLevel { get; set; } = string.Empty;
}
