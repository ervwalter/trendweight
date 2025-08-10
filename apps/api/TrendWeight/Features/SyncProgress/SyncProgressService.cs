using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using TrendWeight.Features.Common;
using TrendWeight.Features.SyncProgress.Models;
using TrendWeight.Infrastructure.DataAccess;

namespace TrendWeight.Features.SyncProgress;

public class SyncProgressService : ISyncProgressReporter, IAsyncDisposable
{
    private readonly ISupabaseService _supabaseService;
    private readonly ICurrentRequestContext _requestContext;
    private readonly ILogger<SyncProgressService> _logger;
    private readonly Guid? _progressId;
    private SyncProgressRow? _currentRow;

    public SyncProgressService(
        ISupabaseService supabaseService,
        ICurrentRequestContext requestContext,
        ILogger<SyncProgressService> logger)
    {
        _supabaseService = supabaseService;
        _requestContext = requestContext;
        _logger = logger;
        _progressId = requestContext.ProgressId;
    }

    public async Task StartAsync(string provider = "all", string status = "running")
    {
        if (!_progressId.HasValue || _currentRow != null)
            return;

        try
        {
            _currentRow = new SyncProgressRow
            {
                Id = _progressId.Value,
                Uid = _requestContext.UserId,
                ExternalId = _requestContext.ExternalId,
                Provider = provider,
                Status = status,
                Providers = [],
                StartedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture),
                UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture)
            };

            await _supabaseService.InsertAsync(_currentRow);
            _logger.LogDebug("Created progress row for {ProgressId} with provider {Provider} and status {Status}",
                _progressId, provider, status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create progress row for {ProgressId}", _progressId);
            _currentRow = null;
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
        if (!_progressId.HasValue)
            return;

        try
        {
            // Ensure row is created
            if (_currentRow == null)
            {
                await StartAsync();
                if (_currentRow == null)
                    return;
            }

            // Update the specific provider's progress in memory
            var providers = _currentRow.Providers ?? [];
            var providerProgress = providers.FirstOrDefault(p => p.Provider == provider);

            if (providerProgress == null)
            {
                // First time seeing this provider - add it
                providerProgress = new ProviderProgress { Provider = provider };
                providers.Add(providerProgress);
            }

            // Update all fields (allows clearing by passing null)
            providerProgress.Stage = stage;
            providerProgress.Current = current;
            providerProgress.Total = total;
            providerProgress.Percent = percent;
            providerProgress.Message = message;

            // Update the row
            _currentRow.Providers = providers;
            _currentRow.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture);

            await _supabaseService.UpdateAsync(_currentRow);

            _logger.LogDebug("Updated progress for provider {Provider}: stage={Stage}, current={Current}, total={Total}",
                provider, stage, current, total);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update progress for {Provider}", provider);
        }
    }

    public async Task UpdateStatusAsync(string status, string? message = null)
    {
        if (!_progressId.HasValue || _currentRow == null)
            return;

        try
        {
            _currentRow.Status = status;
            if (message != null)
            {
                _currentRow.Message = message;
            }
            _currentRow.UpdatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd\"T\"HH:mm:ss\"Z\"", CultureInfo.InvariantCulture);

            await _supabaseService.UpdateAsync(_currentRow);

            _logger.LogDebug("Updated progress status to {Status} with message: {Message}", status, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update status to {Status}", status);
        }
    }

    public async ValueTask DisposeAsync()
    {
        // Delete the progress row when request ends
        if (_currentRow != null && _progressId.HasValue)
        {
            try
            {
                await _supabaseService.DeleteAsync(_currentRow);
                _logger.LogDebug("Deleted progress row {ProgressId} on disposal", _progressId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete progress row on disposal");
            }
        }

        GC.SuppressFinalize(this);
    }
}
