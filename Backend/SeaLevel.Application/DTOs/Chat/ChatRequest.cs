namespace SeaLevel.Application.DTOs.Chat;

public class ChatRequest
{
    public string Message { get; set; } = string.Empty;

    public ChatContext Context { get; set; } = new();
}
