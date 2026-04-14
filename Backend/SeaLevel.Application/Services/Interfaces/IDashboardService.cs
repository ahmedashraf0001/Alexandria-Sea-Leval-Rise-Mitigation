using SeaLevel.Application.DTOs.Dashboard;

namespace SeaLevel.Application.Services.Interfaces;

public interface IDashboardService
{
    Task<DashboardResponse> GetDashboardAsync(
        string scenario,
        int year,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
