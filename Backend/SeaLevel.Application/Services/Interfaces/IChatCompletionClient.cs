namespace SeaLevel.Application.Services.Interfaces;

public interface IChatCompletionClient
{
    Task<string> GetChatCompletionAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken = default);
}