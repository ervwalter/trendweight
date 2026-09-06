namespace TrendWeight.Features.Common.Models;

/// <summary>
/// Standard API error response. The web client reads <see cref="Error"/> and
/// <see cref="ErrorCode"/>, so every error body the API writes uses this shape.
/// </summary>
public class ApiErrorResponse
{
    /// <summary>
    /// User-friendly error message
    /// </summary>
    public string Error { get; set; } = string.Empty;

    /// <summary>
    /// Error code for programmatic handling
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Whether the error is retryable
    /// </summary>
    public bool IsRetryable { get; set; }

    /// <summary>
    /// Identifier logged with an unhandled exception so a report can be matched to it
    /// </summary>
    public string? CorrelationId { get; set; }

    /// <summary>
    /// Exception details; only populated in Development
    /// </summary>
    public string? Details { get; set; }
}

/// <summary>
/// Common error codes
/// </summary>
public static class ErrorCodes
{
    public const string RateLimited = "RATE_LIMITED";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string InvalidCode = "INVALID_CODE";
    public const string Forbidden = "FORBIDDEN";
    public const string ServiceUnavailable = "SERVICE_UNAVAILABLE";
    public const string UnexpectedError = "UNEXPECTED_ERROR";
    public const string ProviderDisabled = "PROVIDER_DISABLED";
}
