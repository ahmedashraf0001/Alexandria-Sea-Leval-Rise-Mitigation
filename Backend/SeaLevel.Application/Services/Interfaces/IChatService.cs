using SeaLevel.Application.DTOs.Chat;

namespace SeaLevel.Application.Services.Interfaces;

public interface IChatService
{
    Task<IReadOnlyList<ChatMetricItem>> GetMetricsAsync(CancellationToken cancellationToken = default);

    Task<ChatResponse> SendMessageAsync(ChatRequest request, CancellationToken cancellationToken = default);
}
