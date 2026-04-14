using SeaLevel.Application.DTOs.Analytics;

namespace SeaLevel.Application.Services.Interfaces;

public interface IAnalyticsService
{
    Task<AnalyticsChartsResponse> GetChartsAsync(
        string scenario,
    int year,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
