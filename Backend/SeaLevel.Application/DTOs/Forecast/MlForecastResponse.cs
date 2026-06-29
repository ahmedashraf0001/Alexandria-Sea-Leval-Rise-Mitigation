using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlForecastResponse
{
    [JsonPropertyName("forecast")]
    public List<MlForecastPoint> Forecast { get; set; } = new();

    [JsonPropertyName("horizon_hours")]
    public int HorizonHours { get; set; }

    [JsonPropertyName("lookback_hours")]
    public int LookbackHours { get; set; }

    [JsonPropertyName("input_last_date")]
    public string InputLastDate { get; set; } = string.Empty;

    [JsonPropertyName("generated_at")]
    public string GeneratedAt { get; set; } = string.Empty;
}
