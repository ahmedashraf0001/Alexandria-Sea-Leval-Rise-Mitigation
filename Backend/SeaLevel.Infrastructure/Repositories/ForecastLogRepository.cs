using Microsoft.EntityFrameworkCore;
using SeaLevel.Core.Entities;
using SeaLevel.Core.Interfaces;
using SeaLevel.Infrastructure.Persistence;

namespace SeaLevel.Infrastructure.Repositories;

public class ForecastLogRepository : IForecastLogRepository
{
    private readonly AppDbContext _dbContext;

    public ForecastLogRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(ForecastLog log, CancellationToken cancellationToken = default)
    {
        await _dbContext.ForecastLogs.AddAsync(log, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IEnumerable<ForecastLog>> GetByUserAsync(string userId, CancellationToken cancellationToken = default)
    {
        List<ForecastLog> logs = await _dbContext.ForecastLogs
            .AsNoTracking()
            .Where(log => log.UserId == userId)
            .OrderByDescending(log => log.RequestedAt)
            .ToListAsync(cancellationToken);

        return logs;
    }
}
