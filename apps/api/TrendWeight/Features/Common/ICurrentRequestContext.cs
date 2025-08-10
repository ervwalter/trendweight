using System;

namespace TrendWeight.Features.Common;

/// <summary>
/// Per-request context populated from auth claims and query parameters.
/// Provides type-safe access to the current user's identifiers and optional progressId.
/// </summary>
public interface ICurrentRequestContext
{
    /// <summary>
    /// Internal UID (Supabase UUID) for the authenticated user.
    /// </summary>
    Guid UserId { get; set; }

    /// <summary>
    /// External Clerk user id (sub), used for RLS policies.
    /// </summary>
    string ExternalId { get; set; }

    /// <summary>
    /// Optional progress id provided by the frontend to stream realtime progress.
    /// </summary>
    Guid? ProgressId { get; set; }
}
