using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlHistoryDay
{
    [JsonPropertyName("date")]
    public DateTime Date { get; set; }

    [JsonPropertyName("SEA_LEVEL")]
    public double SeaLevel { get; set; }

    [JsonPropertyName("WS2M")]
    public double WS2M { get; set; }

    [JsonPropertyName("T2M")]
    public double T2M { get; set; }

    [JsonPropertyName("RH2M")]
    public double RH2M { get; set; }

    [JsonPropertyName("PS")]
    public double PS { get; set; }

    [JsonPropertyName("SLP")]
    public double SLP { get; set; }

    [JsonPropertyName("WD2M")]
    public double WD2M { get; set; }
}
