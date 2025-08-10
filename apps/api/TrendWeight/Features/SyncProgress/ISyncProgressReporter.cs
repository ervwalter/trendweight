using System;
using System.Threading.Tasks;

namespace TrendWeight.Features.SyncProgress;

public interface ISyncProgressReporter
{
    Task StartAsync(string provider = "all", string status = "running");

    Task UpdateProviderProgressAsync(string provider, string? stage = null, int? current = null,
        int? total = null, int? percent = null, string? message = null);

    Task UpdateStatusAsync(string status, string? message = null);
}
