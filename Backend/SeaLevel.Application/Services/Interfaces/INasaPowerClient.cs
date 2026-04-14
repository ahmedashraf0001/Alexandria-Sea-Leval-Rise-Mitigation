using SeaLevel.Application.DTOs.Weather;

namespace SeaLevel.Application.Services.Interfaces;

public interface INasaPowerClient
{
    Task<IEnumerable<DailyWeatherRow>> GetDailyWeatherAsync(
        DateTime from,
        DateTime to,
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default);
}
