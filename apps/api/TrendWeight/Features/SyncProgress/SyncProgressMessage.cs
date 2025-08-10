using System;
using System.Collections.Generic;

namespace TrendWeight.Features.SyncProgress;

/// <summary>
/// Simple model for broadcasting sync progress via Supabase Realtime
/// Designed for JSON serialization without database attributes
/// </summary>
public class SyncProgressMessage
{
    public Guid Id { get; set; }
    public Guid Uid { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public string Provider { get; set; } = "all";
    public string Status { get; set; } = "running";
    public List<ProviderProgressInfo>? Providers { get; set; }
    public int? Percent { get; set; }
    public string? Message { get; set; }
    public string StartedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

/// <summary>
/// Provider-specific progress information for broadcasts
/// Clean model without database attributes
/// </summary>
public class ProviderProgressInfo
{
    public string Provider { get; set; } = string.Empty;
    public string? Stage { get; set; }
    public int? Current { get; set; }
    public int? Total { get; set; }
    public int? Percent { get; set; }
    public string? Message { get; set; }
}
