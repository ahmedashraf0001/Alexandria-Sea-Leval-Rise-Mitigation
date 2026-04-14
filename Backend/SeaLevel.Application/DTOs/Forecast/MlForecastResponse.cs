using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlForecastResponse
{
    [JsonPropertyName("forecast")]
    public List<MlForecastPoint> Forecast { get; set; } = new();

    [JsonPropertyName("horizon_days")]
    public int HorizonDays { get; set; }

    [JsonPropertyName("input_last_date")]
    public string InputLastDate { get; set; } = string.Empty;
}
