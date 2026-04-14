using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using SeaLevel.Application.Services.Interfaces;
using SeaLevel.Infrastructure.Exceptions;

namespace SeaLevel.Infrastructure.Clients;

public class GroqChatClient : IChatCompletionClient
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public GroqChatClient(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<string> GetChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default)
    {
        string? apiKey = _configuration["Groq:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            apiKey = Environment.GetEnvironmentVariable("GROQ_API_KEY");
        }

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("Groq API key is not configured. Set Groq:ApiKey or GROQ_API_KEY.");
        }

        string model = _configuration["Groq:Model"] ?? "llama-3.3-70b-versatile";
        double temperature = _configuration.GetValue<double?>("Groq:Temperature") ?? 0.2;
        int maxTokens = _configuration.GetValue<int?>("Groq:MaxTokens") ?? 900;

        GroqChatCompletionRequest payload = new()
        {
            Model = model,
            Temperature = temperature,
            MaxTokens = maxTokens,
            Messages =
            [
                new GroqMessage { Role = "system", Content = systemPrompt },
                new GroqMessage { Role = "user", Content = userPrompt }
            ]
        };

        HttpClient client = _httpClientFactory.CreateClient("Groq");

        // Use a relative path so BaseAddress can include /openai/v1/.
        using HttpRequestMessage request = new(HttpMethod.Post, "chat/completions")
        {
            Content = JsonContent.Create(payload)
        };

        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        HttpResponseMessage response = await client.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            string errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            string message = string.IsNullOrWhiteSpace(errorBody)
                ? "Groq API request failed."
                : errorBody;

            throw new GroqApiException(message, (int)response.StatusCode);
        }

        await using Stream stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        GroqChatCompletionResponse? parsed = await JsonSerializer.DeserializeAsync<GroqChatCompletionResponse>(
            stream,
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true },
            cancellationToken);

        string? content = parsed?.Choices?.FirstOrDefault()?.Message?.Content?.Trim();
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new GroqApiException("Groq API returned an empty completion payload.", (int)response.StatusCode);
        }

        return content;
    }

    private sealed class GroqChatCompletionRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;

        [JsonPropertyName("messages")]
        public List<GroqMessage> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; }

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; }
    }

    private sealed class GroqMessage
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;
    }

    private sealed class GroqChatCompletionResponse
    {
        [JsonPropertyName("choices")]
        public List<GroqChoice>? Choices { get; set; }
    }

    private sealed class GroqChoice
    {
        [JsonPropertyName("message")]
        public GroqMessage? Message { get; set; }
    }
}