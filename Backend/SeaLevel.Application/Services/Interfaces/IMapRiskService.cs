using SeaLevel.Application.DTOs.MapRisk;

namespace SeaLevel.Application.Services.Interfaces;

public interface IMapRiskService
{
    Task<MapRiskResponse> GetMapRiskAsync(
        string scenario,
        int year,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
