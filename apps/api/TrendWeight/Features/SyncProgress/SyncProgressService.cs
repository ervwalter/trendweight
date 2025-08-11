using Microsoft.Extensions.Logging;
using TrendWeight.Features.Common;
using TrendWeight.Infrastructure.DataAccess;

namespace TrendWeight.Features.SyncProgress;

public class SyncProgressService : ISyncProgressReporter, IDisposable
{
    private readonly ISupabaseService _supabaseService;
    private readonly ICurrentRequestContext _requestContext;
    private readonly ILogger<SyncProgressService> _logger;
    private readonly SemaphoreSlim _messageLock = new(1, 1);
    private SyncProgressMessage? _currentMessage;
    private bool _disposed;

    public SyncProgressService(
        ISupabaseService supabaseService,
        ICurrentRequestContext requestContext,
        ILogger<SyncProgressService> logger)
    {
        _supabaseService = supabaseService;
        _requestContext = requestContext;
        _logger = logger;

        _logger.LogInformation("SyncProgressService created with broadcast support");
    }

    public async Task ReportSyncProgressAsync(string status, string message)
    {
        await _messageLock.WaitAsync();
        try
        {
            await EnsureMessageInitializedAsync();
            if (_currentMessage == null) return;

            _currentMessage.Status = status;
            _currentMessage.Message = message;

            await BroadcastProgressAsync();
            _logger.LogDebug("Broadcast sync progress: {Status} - {Message}", status, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast sync progress: {Status} - {Message}", status, message);
        }
        finally
        {
            _messageLock.Release();
        }
    }

    private Task EnsureMessageInitializedAsync()
    {
        if (_currentMessage != null) return Task.CompletedTask;

        var progressId = _requestContext.ProgressId;
        if (!progressId.HasValue) return Task.CompletedTask;

        try
        {
            _currentMessage = new SyncProgressMessage
            {
                Id = progressId.Value,
                Status = "running",
                Providers = []
            };

            _logger.LogDebug("Initialized progress message for {ProgressId}", progressId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize progress message for {ProgressId}", progressId);
            _currentMessage = null;
        }

        return Task.CompletedTask;
    }

    public async Task ReportProviderProgressAsync(string provider, string stage, string? message = null, int? current = null, int? total = null)
    {
        await _messageLock.WaitAsync();
        try
        {
            await EnsureMessageInitializedAsync();
            if (_currentMessage == null) return;

            // Normalize provider name to lowercase
            provider = provider.ToLowerInvariant();

            // Use a dictionary for clean, duplicate-free provider management
            var providerDict = (_currentMessage.Providers ?? new List<ProviderProgressInfo>())
                .ToDictionary(p => p.Provider, p => p);

            // Update or add the provider (dictionary ensures no duplicates)
            var providerProgress = providerDict.TryGetValue(provider, out var existing)
                ? existing
                : new ProviderProgressInfo { Provider = provider };

            // Update the provider's properties
            providerProgress.Stage = stage;
            providerProgress.Message = message;
            if (current.HasValue) providerProgress.Current = current.Value;
            if (total.HasValue) providerProgress.Total = total.Value;

            // Store back in dictionary
            providerDict[provider] = providerProgress;

            // Convert back to list for the message, sorted by provider name for consistency
            var providers = providerDict.Values.OrderBy(p => p.Provider).ToList();

            // Update the message
            _currentMessage.Providers = providers;

            await BroadcastProgressAsync();

            _logger.LogDebug("Broadcast provider progress for {Provider}: {Stage} - {Message} (Total providers: {Count})",
                provider, stage, message, providers.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast provider progress for {Provider}", provider);
        }
        finally
        {
            _messageLock.Release();
        }
    }



    private Task BroadcastProgressAsync()
    {
        if (_currentMessage == null)
        {
            _logger.LogWarning("Cannot broadcast progress - currentMessage is null");
            return Task.CompletedTask;
        }

        try
        {
            // Validate that progressId is a valid GUID to prevent injection
            if (!Guid.TryParse(_currentMessage.Id.ToString(), out _))
            {
                _logger.LogError("Invalid progress ID format: {ProgressId}", _currentMessage.Id);
                return Task.CompletedTask;
            }

            // Use simple progressId-based topic (no user ID needed since progress data isn't sensitive)
            var topic = $"sync-progress:{_currentMessage.Id}";
            const string eventName = "progress_update";

            // Fire and forget - don't await to avoid blocking the sync
            _ = _supabaseService.BroadcastAsync(topic, eventName, _currentMessage);

            _logger.LogDebug("Queued progress update broadcast for {ProgressId}", _currentMessage.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while broadcasting progress update for {ProgressId}", _currentMessage?.Id);
        }

        return Task.CompletedTask;
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _messageLock?.Dispose();
            }
            _disposed = true;
        }
    }
}
