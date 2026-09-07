using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using TrendWeight.Features.Common.Models;

namespace TrendWeight.Infrastructure.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
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
        catch (Exception ex) when (!context.Response.HasStarted
            && !(ex is OperationCanceledException && context.RequestAborted.IsCancellationRequested))
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogError(ex, "An unhandled exception occurred. CorrelationId: {CorrelationId}", correlationId);
            await HandleExceptionAsync(context, ex, correlationId);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string correlationId)
    {
        context.Response.ContentType = "application/json";

        var response = new ApiErrorResponse
        {
            CorrelationId = correlationId
        };
        int statusCode;

        // Controllers translate expected failures into responses themselves, so
        // anything reaching here is an internal error. Exception messages are never
        // echoed: BCL exceptions (argument, key lookups, ...) carry implementation
        // details and only surface here as bugs.
        switch (exception)
        {
            case UnauthorizedAccessException:
                // Thrown by the base controllers when the principal carries no identity
                // claim: the caller is not authenticated, not authenticated-but-refused.
                response.Error = "Authentication required";
                statusCode = (int)HttpStatusCode.Unauthorized;
                response.ErrorCode = ErrorCodes.Unauthorized;
                break;

            default:
                response.Error = "An error occurred while processing your request";
                statusCode = (int)HttpStatusCode.InternalServerError;
                response.ErrorCode = "INTERNAL_ERROR";

                // Only include exception details in development mode
                if (_environment.IsDevelopment())
                {
                    response.Details = exception.ToString();
                }
                break;
        }

        context.Response.StatusCode = statusCode;

        var jsonResponse = JsonSerializer.Serialize(response, JsonOptions);

        await context.Response.WriteAsync(jsonResponse);
    }
}
