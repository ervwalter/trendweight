using System;
using System.Threading.Tasks;

namespace TrendWeight.Features.SyncProgress;

public interface ISyncProgressReporter
{
    // Overall sync progress methods
    Task ReportSyncProgressAsync(string status, string message);

    // Provider-specific progress methods
    Task ReportProviderProgressAsync(string provider, string stage, string? message = null, int? current = null, int? total = null);
}
