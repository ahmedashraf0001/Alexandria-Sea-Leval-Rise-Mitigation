using SeaLevel.Application.DTOs.Forecast;

namespace SeaLevel.Application.Services.Interfaces;

public interface IMlForecastClient
{
    Task<MlForecastResponse> GetForecastAsync(
        int? horizonHours = null,
        CancellationToken cancellationToken = default);

    Task<MlForecastResponse> GetQuickForecastAsync(
        int? horizonHours = null,
        CancellationToken cancellationToken = default);
}
