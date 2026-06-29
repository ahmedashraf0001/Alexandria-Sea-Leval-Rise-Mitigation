using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlForecastPoint
{
    [JsonPropertyName("date")]
    public string Date { get; set; } = string.Empty;

    [JsonPropertyName("hour")]
    public int Hour { get; set; }

    [JsonPropertyName("predicted_twl")]
    public double PredictedTwl { get; set; }
}
