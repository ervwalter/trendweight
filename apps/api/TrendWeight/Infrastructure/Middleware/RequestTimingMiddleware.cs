using System.Diagnostics;

namespace TrendWeight.Infrastructure.Middleware;

public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    public RequestTimingMiddleware(RequestDelegate next, ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);

            if (stopwatch.ElapsedMilliseconds > 1000)
            {
                _logger.LogWarning("Slow request: {Method} {Path} took {ElapsedMs}ms",
                    context.Request.Method, context.Request.Path, stopwatch.ElapsedMilliseconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Request failed: {Method} {Path} after {ElapsedMs}ms",
                context.Request.Method, context.Request.Path, stopwatch.ElapsedMilliseconds);
            throw;
        }
    }
}
