namespace SeaLevel.Core.Entities;

public class ForecastLog
{
    public int Id { get; set; }

    public string UserId { get; set; } = string.Empty;

    public string Scenario { get; set; } = string.Empty;

    public int Year { get; set; }

    public DateTime RequestedAt { get; set; }

    public double BaselineSeaLevel { get; set; }

    public double ProjectedSeaLevel { get; set; }
}
