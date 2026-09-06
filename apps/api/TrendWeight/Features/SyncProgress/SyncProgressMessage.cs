using System;
using System.Collections.Generic;
using System.Linq;

namespace TrendWeight.Features.SyncProgress;

/// <summary>
/// Minimal model for broadcasting sync progress via Supabase Realtime
/// Only includes fields actually used by the frontend
/// </summary>
public class SyncProgressMessage
{
    public Guid Id { get; set; }
    public string Status { get; set; } = "running";
    public string? Message { get; set; }
    public List<ProviderProgressInfo>? Providers { get; set; }

    /// <summary>
    /// Deep copy, so a broadcast in flight is unaffected by later progress updates
    /// </summary>
    public SyncProgressMessage Clone() => new()
    {
        Id = Id,
        Status = Status,
        Message = Message,
        Providers = Providers?.Select(p => p.Clone()).ToList()
    };
}

/// <summary>
/// Provider-specific progress information for broadcasts
/// Includes fields for precise progress calculation
/// </summary>
public class ProviderProgressInfo
{
    public string Provider { get; set; } = string.Empty;
    public string? Stage { get; set; }
    public string? Message { get; set; }
    public int? Current { get; set; }
    public int? Total { get; set; }

    public ProviderProgressInfo Clone() => new()
    {
        Provider = Provider,
        Stage = Stage,
        Message = Message,
        Current = Current,
        Total = Total
    };
}
