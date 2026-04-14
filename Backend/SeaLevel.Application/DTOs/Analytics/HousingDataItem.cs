namespace SeaLevel.Application.DTOs.Analytics;

public class HousingDataItem
{
    public double Value { get; set; }

    public string Color { get; set; } = string.Empty;

    // NOTE: Frontend contract marks this field as unknown; using string for chart labels.
    public string Name { get; set; } = string.Empty;
}
