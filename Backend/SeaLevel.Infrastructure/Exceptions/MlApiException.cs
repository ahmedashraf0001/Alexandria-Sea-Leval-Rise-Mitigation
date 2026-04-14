namespace SeaLevel.Infrastructure.Exceptions;

public class MlApiException : Exception
{
    public MlApiException(string message, int statusCode)
        : base(message)
    {
        StatusCode = statusCode;
    }

    public int StatusCode { get; }
}
