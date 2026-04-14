using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Weather;

namespace SeaLevel.Application.Services.Interfaces;

public interface IMlForecastClient
{
    Task<MlForecastResponse> GetForecastAsync(
        IEnumerable<DailyWeatherRow>? newDays = null,
        int? horizonDays = null,
        CancellationToken cancellationToken = default);

    Task<MlForecastResponse> GetQuickForecastAsync(
        int? horizonDays = null,
        CancellationToken cancellationToken = default);
}
