using System;
using System.Collections.Generic;
using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

namespace TrendWeight.Features.SyncProgress.Models;

[Table("sync_progress")]
public class SyncProgressRow : BaseModel
{
    [PrimaryKey("id")]
    [Column("id")]
    public Guid Id { get; set; }

    [Column("uid")]
    public Guid Uid { get; set; }

    [Column("external_id")]
    public string ExternalId { get; set; } = string.Empty;

    [Column("provider")]
    public string Provider { get; set; } = "all";

    [Column("status")]
    public string Status { get; set; } = "running";

    [Column("providers")]
    public List<ProviderProgress>? Providers { get; set; }

    [Column("percent")]
    public int? Percent { get; set; }

    [Column("message")]
    public string? Message { get; set; }

    [Column("started_at")]
    public string StartedAt { get; set; } = string.Empty;

    [Column("updated_at")]
    public string UpdatedAt { get; set; } = string.Empty;
}

public class ProviderProgress
{
    public string Provider { get; set; } = string.Empty;
    public string? Stage { get; set; }
    public int? Current { get; set; }
    public int? Total { get; set; }
    public int? Percent { get; set; }
    public string? Message { get; set; }
}
