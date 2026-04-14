using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Infrastructure.Clients;

public class CachedNasaPowerClient : INasaPowerClient
{
    private readonly NasaPowerClient _innerClient;
    private readonly IMemoryCache _memoryCache;
    private readonly IConfiguration _configuration;

    public CachedNasaPowerClient(
        NasaPowerClient innerClient,
        IMemoryCache memoryCache,
        IConfiguration configuration)
    {
        _innerClient = innerClient;
        _memoryCache = memoryCache;
        _configuration = configuration;
    }

    public async Task<IEnumerable<DailyWeatherRow>> GetDailyWeatherAsync(
        DateTime from,
        DateTime to,
        double? latitude = null,
        double? longitude = null,
        CancellationToken cancellationToken = default)
    {
        double lat = latitude ?? _configuration.GetValue<double?>("NasaPower:Latitude") ?? 31.04;
        double lon = longitude ?? _configuration.GetValue<double?>("NasaPower:Longitude") ?? 31.38;

        string cacheKey = $"nasa:{lat}:{lon}:{from:yyyyMMdd}:{to:yyyyMMdd}";
        if (_memoryCache.TryGetValue(cacheKey, out IReadOnlyList<DailyWeatherRow>? cachedRows) && cachedRows is not null)
        {
            return cachedRows;
        }

        IEnumerable<DailyWeatherRow> rows = await _innerClient.GetDailyWeatherAsync(
            from,
            to,
            lat,
            lon,
            cancellationToken);

        int ttlHours = _configuration.GetValue<int?>("NasaPower:CacheTtlHours") ?? 6;
        List<DailyWeatherRow> rowsList = rows.ToList();

        _memoryCache.Set(cacheKey, rowsList, TimeSpan.FromHours(ttlHours));

        return rowsList;
    }
}
