namespace TrendWeight.Features.Providers;

/// <summary>
/// Service that orchestrates provider integrations
/// </summary>
public interface IProviderIntegrationService
{
    /// <summary>
    /// Gets a specific provider service by name
    /// </summary>
    IProviderService? GetProviderService(string providerName);

    /// <summary>
    /// Gets all active provider names for a user
    /// </summary>
    Task<List<string>> GetActiveProvidersAsync(Guid userId);
}

/// <summary>
/// Implementation of provider integration orchestrator
/// </summary>
public class ProviderIntegrationService : IProviderIntegrationService
{
    private readonly Dictionary<string, IProviderService> _providerServices;
    private readonly ILogger<ProviderIntegrationService> _logger;

    public ProviderIntegrationService(
        IEnumerable<IProviderService> providerServices,
        ILogger<ProviderIntegrationService> logger)
    {
        _providerServices = providerServices.ToDictionary(
            v => v.ProviderName.ToLowerInvariant(),
            v => v);
        _logger = logger;
    }

    /// <inheritdoc />
    public IProviderService? GetProviderService(string providerName)
    {
        return _providerServices.TryGetValue(providerName.ToLowerInvariant(), out var service)
            ? service
            : null;
    }

    /// <inheritdoc />
    public async Task<List<string>> GetActiveProvidersAsync(Guid userId)
    {
        var activeProviders = new List<string>();

        foreach (var (providerName, providerService) in _providerServices)
        {
            if (await providerService.HasActiveProviderLinkAsync(userId))
            {
                activeProviders.Add(providerName);
            }
        }

        return activeProviders;
    }
}
