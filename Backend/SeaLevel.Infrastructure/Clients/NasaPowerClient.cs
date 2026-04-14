using System.Globalization;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Interfaces;
using SeaLevel.Infrastructure.Exceptions;

namespace SeaLevel.Infrastructure.Clients;

public class NasaPowerClient : INasaPowerClient
{
    private const double FillValue = -999.0;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public NasaPowerClient(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
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
        string community = _configuration["NasaPower:Community"] ?? "RE";
        string parameters = _configuration["NasaPower:Parameters"] ?? "WS2M,T2M,RH2M,PS,SLP,WD2M";

        QueryString queryString = new QueryString()
            .Add("parameters", parameters)
            .Add("community", community)
            .Add("latitude", lat.ToString(CultureInfo.InvariantCulture))
            .Add("longitude", lon.ToString(CultureInfo.InvariantCulture))
            .Add("start", from.ToString("yyyyMMdd", CultureInfo.InvariantCulture))
            .Add("end", to.ToString("yyyyMMdd", CultureInfo.InvariantCulture))
            .Add("format", "JSON");

        string requestPath = "/api/temporal/daily/point" + queryString.ToUriComponent();

        HttpClient client = _httpClientFactory.CreateClient("NasaPower");
        using HttpRequestMessage request = new(HttpMethod.Get, requestPath);

        HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            string message = string.IsNullOrWhiteSpace(errorBody)
                ? "NASA POWER request failed."
                : errorBody;

            throw new NasaPowerException(message, (int)response.StatusCode);
        }

        await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        NasaPowerRoot? payload = await JsonSerializer.DeserializeAsync<NasaPowerRoot>(
            stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            cancellationToken);

        NasaPowerParameter? parameter = payload?.Properties?.Parameter;
        if (parameter is null)
        {
            throw new NasaPowerException("NASA POWER response is missing properties.parameter.", 502);
        }

        Dictionary<string, double> ws2m = parameter.WS2M ?? throw new NasaPowerException("NASA POWER response missing WS2M.", 502);
        Dictionary<string, double> t2m = parameter.T2M ?? throw new NasaPowerException("NASA POWER response missing T2M.", 502);
        Dictionary<string, double> rh2m = parameter.RH2M ?? throw new NasaPowerException("NASA POWER response missing RH2M.", 502);
        Dictionary<string, double> ps = parameter.PS ?? throw new NasaPowerException("NASA POWER response missing PS.", 502);
        Dictionary<string, double> slp = parameter.SLP ?? throw new NasaPowerException("NASA POWER response missing SLP.", 502);
        Dictionary<string, double> wd2m = parameter.WD2M ?? throw new NasaPowerException("NASA POWER response missing WD2M.", 502);

        IEnumerable<string> commonDateKeys = ws2m.Keys
            .Intersect(t2m.Keys)
            .Intersect(rh2m.Keys)
            .Intersect(ps.Keys)
            .Intersect(slp.Keys)
            .Intersect(wd2m.Keys)
            .OrderBy(key => key, StringComparer.Ordinal);

        List<DailyWeatherRow> rows = new();
        foreach (string dateKey in commonDateKeys)
        {
            double ws2mValue = ws2m[dateKey];
            double t2mValue = t2m[dateKey];
            double rh2mValue = rh2m[dateKey];
            double psValue = ps[dateKey];
            double slpValue = slp[dateKey];
            double wd2mValue = wd2m[dateKey];

            if (ws2mValue == FillValue ||
                t2mValue == FillValue ||
                rh2mValue == FillValue ||
                psValue == FillValue ||
                slpValue == FillValue ||
                wd2mValue == FillValue)
            {
                continue;
            }

            DateTime date = DateTime.ParseExact(dateKey, "yyyyMMdd", CultureInfo.InvariantCulture);
            rows.Add(new DailyWeatherRow(date, ws2mValue, t2mValue, rh2mValue, psValue, slpValue, wd2mValue));
        }

        return rows.OrderBy(row => row.Date).ToList();
    }

    private sealed class NasaPowerRoot
    {
        public NasaPowerProperties? Properties { get; set; }
    }

    private sealed class NasaPowerProperties
    {
        public NasaPowerParameter? Parameter { get; set; }
    }

    private sealed class NasaPowerParameter
    {
        public Dictionary<string, double>? WS2M { get; set; }

        public Dictionary<string, double>? T2M { get; set; }

        public Dictionary<string, double>? RH2M { get; set; }

        public Dictionary<string, double>? PS { get; set; }

        public Dictionary<string, double>? SLP { get; set; }

        public Dictionary<string, double>? WD2M { get; set; }
    }
}
