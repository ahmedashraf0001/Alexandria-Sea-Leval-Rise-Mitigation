using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SeaLevel.Application.DTOs.Chat;
using SeaLevel.Application.Services.Interfaces;

namespace SeaLevel.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;

    public ChatController(IChatService chatService)
    {
        _chatService = chatService;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<IReadOnlyList<ChatMetricItem>>> GetMetrics(CancellationToken cancellationToken)
    {
        IReadOnlyList<ChatMetricItem> response = await _chatService.GetMetricsAsync(cancellationToken);
        return Ok(response);
    }

    [HttpPost]
    public async Task<ActionResult<ChatResponse>> Post(
        [FromBody] ChatRequest request,
        CancellationToken cancellationToken)
    {
        ChatResponse response = await _chatService.SendMessageAsync(request, cancellationToken);
        return Ok(response);
    }
}
