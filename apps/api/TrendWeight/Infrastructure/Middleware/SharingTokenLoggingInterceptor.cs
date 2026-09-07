using Microsoft.AspNetCore.HttpLogging;

namespace TrendWeight.Infrastructure.Middleware;

/// <summary>
/// Keeps sharing tokens out of the HTTP request log. The built-in logger writes
/// the raw request path, so the path field is replaced with its redacted form.
/// </summary>
public sealed class SharingTokenLoggingInterceptor : IHttpLoggingInterceptor
{
    public ValueTask OnRequestAsync(HttpLoggingInterceptorContext logContext)
    {
        if (logContext.LoggingFields.HasFlag(HttpLoggingFields.RequestPath))
        {
            logContext.LoggingFields &= ~HttpLoggingFields.RequestPath;
            logContext.AddParameter("PathBase", logContext.HttpContext.Request.PathBase.Value ?? string.Empty);
            logContext.AddParameter("Path", LogSafePath.Redact(logContext.HttpContext.Request.Path));
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask OnResponseAsync(HttpLoggingInterceptorContext logContext) => ValueTask.CompletedTask;
}
