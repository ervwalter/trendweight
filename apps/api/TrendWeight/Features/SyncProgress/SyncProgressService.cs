using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrendWeight.Features.Common;
using TrendWeight.Infrastructure.DataAccess;

namespace TrendWeight.Features.SyncProgress;

public class SyncProgressService : ISyncProgressReporter, IAsyncDisposable
{
    private readonly ISupabaseService _supabaseService;
    private readonly ICurrentRequestContext _requestContext;
    private readonly ILogger<SyncProgressService> _logger;
    private SyncProgressMessage? _currentMessage;

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

    public async Task StartAsync(string provider = "all", string status = "running")
    {
        // Get ProgressId from context when StartAsync is called (not from constructor)
        var progressId = _requestContext.ProgressId;

        _logger.LogInformation("StartAsync called with provider: {Provider}, status: {Status}, progressId: {ProgressId}, currentMessage: {CurrentMessage}, UserId: {UserId}, ExternalId: {ExternalId}",
            provider, status, progressId, _currentMessage != null ? "exists" : "null", _requestContext.UserId, _requestContext.ExternalId);

        if (!progressId.HasValue || _currentMessage != null)
        {
            _logger.LogWarning("StartAsync returning early - progressId: {HasProgressId}, currentMessage: {HasCurrentMessage}",
                progressId.HasValue, _currentMessage != null);
            return;
        }

        try
        {
            _currentMessage = new SyncProgressMessage
            {
                Id = progressId.Value,
                Uid = _requestContext.UserId,
                ExternalId = _requestContext.ExternalId,
                Provider = provider,
                Status = status,
                Providers = [],
                StartedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture),
                UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture)
            };

            await BroadcastProgressAsync();
            _logger.LogDebug("Broadcast initial progress for {ProgressId} with provider {Provider} and status {Status}",
                progressId, provider, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to broadcast initial progress for {ProgressId}", progressId);
            _currentMessage = null;
        }
    }

    public async Task UpdateProviderProgressAsync(
        string provider,
        string? stage = null,
        int? current = null,
        int? total = null,
        int? percent = null,
        string? message = null)
    {
        if (!_requestContext.ProgressId.HasValue)
            return;

        try
        {
            // Ensure message is created
            if (_currentMessage == null)
            {
                await StartAsync();
                if (_currentMessage == null)
                    return;
            }

            // Update the specific provider's progress in memory
            var providers = _currentMessage.Providers ?? [];
            var providerProgress = providers.FirstOrDefault(p => p.Provider == provider);

            if (providerProgress == null)
            {
                // First time seeing this provider - add it
                providerProgress = new ProviderProgressInfo { Provider = provider };
                providers.Add(providerProgress);
            }

            // Update all fields (allows clearing by passing null)
            providerProgress.Stage = stage;
            providerProgress.Current = current;
            providerProgress.Total = total;
            providerProgress.Percent = percent;
            providerProgress.Message = message;

            // Update the message
            _currentMessage.Providers = providers;
            _currentMessage.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture);

            await BroadcastProgressAsync();

            _logger.LogDebug("Broadcast progress update for provider {Provider}: stage={Stage}, current={Current}, total={Total}",
                provider, stage, current, total);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update progress for {Provider}", provider);
        }
    }

    public async Task UpdateStatusAsync(string status, string? message = null)
    {
        if (!_requestContext.ProgressId.HasValue || _currentMessage == null)
            return;

        try
        {
            _currentMessage.Status = status;
            if (message != null)
            {
                _currentMessage.Message = message;
            }
            _currentMessage.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture);

            await BroadcastProgressAsync();

            _logger.LogDebug("Broadcast progress status update to {Status} with message: {Message}", status, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status to {Status}", status);
        }
    }

    public ValueTask DisposeAsync()
    {
        // No cleanup needed for broadcast-based progress - messages are ephemeral
        _logger.LogDebug("SyncProgressService disposed for {ProgressId}", _requestContext.ProgressId);
        GC.SuppressFinalize(this);
        return new ValueTask();
    }

    private async Task BroadcastProgressAsync()
    {
        if (_currentMessage == null)
        {
            _logger.LogWarning("Cannot broadcast progress - currentMessage is null");
            return;
        }

        try
        {
            // Use user-specific secure channel with colon separators
            var topic = $"sync-progress:{_requestContext.ExternalId}:{_currentMessage.Id}";
            const string eventName = "progress_update";

            var success = await _supabaseService.BroadcastAsync(topic, eventName, _currentMessage);

            if (success)
            {
                _logger.LogDebug("Successfully broadcast progress update for {ProgressId}", _currentMessage.Id);
            }
            else
            {
                _logger.LogWarning("Failed to broadcast progress update for {ProgressId}", _currentMessage.Id);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while broadcasting progress update for {ProgressId}", _currentMessage?.Id);
        }
    }
}
