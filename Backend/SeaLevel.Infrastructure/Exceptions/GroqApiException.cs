namespace SeaLevel.Infrastructure.Exceptions;

public class GroqApiException : Exception
{
    public GroqApiException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}