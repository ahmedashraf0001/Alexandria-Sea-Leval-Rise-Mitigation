using System.Text.Json.Serialization;

namespace SeaLevel.Application.DTOs.Weather;

public record DailyWeatherRow(
    [property: JsonPropertyName("date")] DateTime Date,
    [property: JsonPropertyName("WS2M")] double WS2M,
    [property: JsonPropertyName("T2M")] double T2M,
    [property: JsonPropertyName("RH2M")] double RH2M,
    [property: JsonPropertyName("PS")] double PS,
    [property: JsonPropertyName("SLP")] double SLP,
    [property: JsonPropertyName("WD2M")] double WD2M
);
