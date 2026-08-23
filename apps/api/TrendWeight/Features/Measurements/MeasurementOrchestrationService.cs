using TrendWeight.Features.Common;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.Providers;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Features.Measurements;

public class MeasurementOrchestrationService : IMeasurementOrchestrationService
{
    private readonly IProfileService _profileService;
    private readonly IProviderIntegrationService _providerIntegrationService;
    private readonly IMeasurementSyncService _measurementSyncService;
    private readonly IMeasurementComputationService _measurementComputationService;
    private readonly ICurrentRequestContext _requestContext;
    private readonly ILogger<MeasurementOrchestrationService> _logger;

    public MeasurementOrchestrationService(
        IProfileService profileService,
        IProviderIntegrationService providerIntegrationService,
        IMeasurementSyncService measurementSyncService,
        IMeasurementComputationService measurementComputationService,
        ICurrentRequestContext requestContext,
        ILogger<MeasurementOrchestrationService> logger)
    {
        _profileService = profileService;
        _providerIntegrationService = providerIntegrationService;
        _measurementSyncService = measurementSyncService;
        _measurementComputationService = measurementComputationService;
        _requestContext = requestContext;
        _logger = logger;
    }

    public async Task<MeasurementDataResult?> GetForUserAsync(Guid userId, string? externalId, Guid? progressId)
    {
        _requestContext.UserId = userId;
        // External ID is required for RLS updates but may be absent (test paths, API keys)
        _requestContext.ExternalId = externalId ?? string.Empty;
        if (progressId.HasValue)
        {
            _requestContext.ProgressId = progressId;
            _logger.LogInformation("Progress ID set to: {ProgressId} for user: {UserId}", progressId, userId);
        }

        _logger.LogInformation("Getting measurements for user ID: {UserId}", userId);

        var user = await _profileService.GetByIdAsync(userId);
        if (user == null)
        {
            return null;
        }

        return await GetForProfileAsync(user);
    }

    public async Task<MeasurementDataResult> GetForProfileAsync(DbProfile profile)
    {
        // Get measurements with automatic provider refresh
        var activeProviders = await _providerIntegrationService.GetActiveProvidersAsync(profile.Uid);
        var result = await _measurementSyncService.GetMeasurementsForUserAsync(
            profile.Uid,
            activeProviders,
            profile.Profile.UseMetric);

        // Compute trend measurements from source data
        var computedMeasurements = _measurementComputationService
            .ComputeMeasurements(result.Data, profile.Profile);

        return new MeasurementDataResult(profile, computedMeasurements, result.Data, result.ProviderStatus);
    }
}
