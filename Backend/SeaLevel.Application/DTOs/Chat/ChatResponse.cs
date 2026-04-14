namespace SeaLevel.Application.DTOs.Chat;

public class ChatResponse
{
    public string Reply { get; set; } = string.Empty;

    public IReadOnlyList<ChatReferenceItem> References { get; set; } = Array.Empty<ChatReferenceItem>();
}
