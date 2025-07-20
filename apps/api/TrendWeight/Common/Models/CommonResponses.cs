namespace TrendWeight.Common.Models;

/// <summary>
/// Response model for error responses
/// </summary>
public class ErrorResponse
{
    public required string Error { get; set; }
}

/// <summary>
/// Response model for simple success responses
/// </summary>
public class SuccessResponse
{
    public bool Success { get; set; } = true;
}

/// <summary>
/// Response model for message responses
/// </summary>
public class MessageResponse
{
    public required string Message { get; set; }
}
