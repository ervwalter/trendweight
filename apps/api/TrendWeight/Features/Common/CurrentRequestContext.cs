using System;

namespace TrendWeight.Features.Common;

public class CurrentRequestContext : ICurrentRequestContext
{
    public Guid UserId { get; set; }
    public string ExternalId { get; set; } = string.Empty;
    public Guid? ProgressId { get; set; }
}
