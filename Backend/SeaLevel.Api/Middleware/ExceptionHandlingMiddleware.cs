using System.Net;
using System.Text.Json;
using FluentValidation;
using SeaLevel.Infrastructure.Exceptions;

namespace SeaLevel.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            await HandleExceptionAsync(context, exception);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        _logger.LogError(exception, "Unhandled exception on {Path}", context.Request.Path);

        context.Response.ContentType = "application/json";

        object payload;

        if (exception is MlApiException mlApiException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadGateway;
            payload = new { error = mlApiException.Message, statusCode = context.Response.StatusCode };
        }
        else if (exception is GroqApiException groqApiException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadGateway;
            payload = new { error = groqApiException.Message, statusCode = context.Response.StatusCode };
        }
        else if (exception is NasaPowerException nasaPowerException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.ServiceUnavailable;
            payload = new { error = nasaPowerException.Message, statusCode = context.Response.StatusCode };
        }
        else if (exception is ValidationException validationException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            payload = new
            {
                error = "Validation failed.",
                statusCode = context.Response.StatusCode,
                fieldErrors = validationException.Errors.Select(error => new
                {
                    field = error.PropertyName,
                    error = error.ErrorMessage
                })
            };
        }
        else if (exception is UnauthorizedAccessException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.Unauthorized;
            payload = new { error = exception.Message, statusCode = context.Response.StatusCode };
        }
        else if (exception is ArgumentException)
        {
            context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
            payload = new { error = exception.Message, statusCode = context.Response.StatusCode };
        }
        else
        {
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            payload = new { error = "An unexpected error occurred.", statusCode = context.Response.StatusCode };
        }

        string json = JsonSerializer.Serialize(payload);
        await context.Response.WriteAsync(json);
    }
}
