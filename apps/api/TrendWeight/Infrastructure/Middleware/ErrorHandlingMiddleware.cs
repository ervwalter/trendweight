using System.Net;
using System.Text.Json;

namespace TrendWeight.Infrastructure.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger, IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "An unhandled exception occurred. CorrelationId: {CorrelationId}", correlationId);
            await HandleExceptionAsync(context, ex, correlationId);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string correlationId)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            CorrelationId = correlationId
        };

        switch (exception)
        {
            case ArgumentNullException:
            case ArgumentException:
                // Note: ArgumentExceptions are not thrown in this codebase, but keeping for safety
                // Only expose the message for these validation exceptions after audit
                response.Message = exception.Message;
                response.StatusCode = (int)HttpStatusCode.BadRequest;
                response.ErrorCode = "VALIDATION_ERROR";
                break;

            case KeyNotFoundException:
                response.Message = "Resource not found";
                response.StatusCode = (int)HttpStatusCode.NotFound;
                response.ErrorCode = "RESOURCE_NOT_FOUND";
                break;

            case UnauthorizedAccessException:
                response.Message = "Access denied";
                response.StatusCode = (int)HttpStatusCode.Forbidden;
                response.ErrorCode = "ACCESS_DENIED";
                break;

            default:
                response.Message = "An error occurred while processing your request";
                response.StatusCode = (int)HttpStatusCode.InternalServerError;
                response.ErrorCode = "INTERNAL_ERROR";

                // Only include exception details in development mode
                if (_environment.IsDevelopment())
                {
                    response.Details = exception.ToString();
                }
                break;
        }

        context.Response.StatusCode = response.StatusCode;

        var jsonResponse = JsonSerializer.Serialize(response, JsonOptions);

        await context.Response.WriteAsync(jsonResponse);
    }
}

public class ErrorResponse
{
    public string Message { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string? Details { get; set; }
    public string? ErrorCode { get; set; }
    public string? CorrelationId { get; set; }
}
