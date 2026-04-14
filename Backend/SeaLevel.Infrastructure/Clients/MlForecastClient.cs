using System.Net.Http.Json;
using System.Text.Json;
using SeaLevel.Application.DTOs.Forecast;
using SeaLevel.Application.DTOs.Weather;
using SeaLevel.Application.Services.Interfaces;
using SeaLevel.Infrastructure.Exceptions;

namespace SeaLevel.Infrastructure.Clients;

public class MlForecastClient : IMlForecastClient
{
    private readonly IHttpClientFactory _httpClientFactory;

    public MlForecastClient(IHttpClientFactory httpClientFactory)
    {
        _httpClientFactory = httpClientFactory;
    }

    public async Task<MlForecastResponse> GetForecastAsync(
        IEnumerable<DailyWeatherRow>? newDays = null,
        int? horizonDays = null,
        CancellationToken cancellationToken = default)
    {
        HttpClient client = _httpClientFactory.CreateClient("MlApi");

        MlForecastRequest requestPayload = new()
        {
            NewDays = newDays?.ToList(),
            HorizonDays = horizonDays
        };

        if (requestPayload.NewDays is { Count: 0 })
        {
            requestPayload.NewDays = null;
        }

        HttpResponseMessage response = await client.PostAsJsonAsync("/forecast", requestPayload, cancellationToken);
        return await ReadForecastResponseAsync(response, cancellationToken);
    }

    public async Task<MlForecastResponse> GetQuickForecastAsync(
        int? horizonDays = null,
        CancellationToken cancellationToken = default)
    {
        HttpClient client = _httpClientFactory.CreateClient("MlApi");

        HttpResponseMessage response = await client.PostAsync("/forecast/quick", content: null, cancellationToken);
        return await ReadForecastResponseAsync(response, cancellationToken);
    }

    private static async Task<MlForecastResponse> ReadForecastResponseAsync(
        HttpResponseMessage response,
        CancellationToken cancellationToken)
    {
        if (!response.IsSuccessStatusCode)
        {
            string errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            string message = string.IsNullOrWhiteSpace(errorBody)
                ? "ML API request failed."
                : errorBody;

            throw new MlApiException(message, (int)response.StatusCode);
        }

        await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        MlForecastResponse? payload = await JsonSerializer.DeserializeAsync<MlForecastResponse>(
            stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            cancellationToken);

        if (payload is null)
        {
            throw new MlApiException("ML API returned an empty response payload.", (int)response.StatusCode);
        }

        return payload;
    }
}
