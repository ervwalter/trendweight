using System;

namespace TrendWeight.Features.Common;

public class CurrentRequestContext : ICurrentRequestContext
{
    public Guid? ProgressId { get; set; }
}
