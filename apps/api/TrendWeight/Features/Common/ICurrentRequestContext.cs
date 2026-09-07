using System;

namespace TrendWeight.Features.Common;

/// <summary>
/// Per-request context for sync progress reporting. The backend talks to Supabase
/// with the service role, so no user identifiers are needed here.
/// </summary>
public interface ICurrentRequestContext
{
    /// <summary>
    /// Optional progress id provided by the frontend to stream realtime progress.
    /// </summary>
    Guid? ProgressId { get; set; }
}
