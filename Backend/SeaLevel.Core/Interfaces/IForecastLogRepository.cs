using SeaLevel.Core.Entities;

namespace SeaLevel.Core.Interfaces;

public interface IForecastLogRepository
{
    Task AddAsync(ForecastLog log, CancellationToken cancellationToken = default);

    Task<IEnumerable<ForecastLog>> GetByUserAsync(string userId, CancellationToken cancellationToken = default);
}
