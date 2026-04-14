using SeaLevel.Application.DTOs.Infrastructure;

namespace SeaLevel.Application.Services.Interfaces;

public interface IInfrastructureService
{
    Task<InfrastructureResponse> GetInfrastructureRiskAsync(
        string scenario,
        int year,
        IEnumerable<string>? sectors = null,
        IEnumerable<string>? risks = null,
        DateTime? from = null,
        DateTime? to = null,
        CancellationToken cancellationToken = default);
}
