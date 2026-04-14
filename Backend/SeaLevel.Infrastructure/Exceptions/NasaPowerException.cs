namespace SeaLevel.Infrastructure.Exceptions;

public class NasaPowerException : Exception
{
    public NasaPowerException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}
