namespace TrendWeight.Features.Common.Models;

/// <summary>
/// Standard API error response
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
