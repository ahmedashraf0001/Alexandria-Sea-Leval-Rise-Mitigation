using System.Text.Json.Serialization;
using SeaLevel.Application.DTOs.Weather;

namespace SeaLevel.Application.DTOs.Forecast;

public class MlForecastRequest
{
    [JsonPropertyName("history")]
    public List<MlHistoryDay>? History { get; set; }

    [JsonPropertyName("new_days")]
    public List<DailyWeatherRow>? NewDays { get; set; }

    [JsonPropertyName("horizon_days")]
    public int? HorizonDays { get; set; }
}
