using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlForecastPoint
{
    [JsonPropertyName("date")]
    public DateTime Date { get; set; }

    [JsonPropertyName("predicted_sea_level")]
    public double PredictedSeaLevel { get; set; }
}
