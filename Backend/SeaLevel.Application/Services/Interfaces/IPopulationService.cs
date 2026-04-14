using SeaLevel.Application.DTOs.Population;

namespace SeaLevel.Application.Services.Interfaces;

public interface IPopulationService
{
    Task<PopulationRiskResponse> GetPopulationRiskAsync(
        string scenario,
        int year,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
