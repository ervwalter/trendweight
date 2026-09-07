using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection.Extensions;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Middleware;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Features.Providers.Fitbit;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Manual;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.Services;
using TrendWeight.Features.ApiKeys;
using TrendWeight.Features.Common;
using TrendWeight.Features.SyncProgress;

namespace TrendWeight.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddClerkAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // AppOptions (Clerk authority etc.) is bound once, in AddTrendWeightServices.

        // Add Clerk services. The token service is a singleton that creates a
        // client from IHttpClientFactory for each JWKS fetch.
        services.AddHttpClient();
        services.TryAddSingleton(TimeProvider.System);
        services.AddSingleton<IClerkTokenService, ClerkTokenService>();
        services.AddScoped<IUserAccountMappingService, UserAccountMappingService>();

        // Configure authentication. Clerk stays the default scheme, so internal
        // endpoints never accept API keys; only /api/v1 opts into the ApiKey scheme.
        services.AddAuthentication("Clerk")
            .AddScheme<AuthenticationSchemeOptions, ClerkAuthenticationHandler>("Clerk", null)
            .AddScheme<AuthenticationSchemeOptions, ApiKeyAuthenticationHandler>(ApiKeyAuthenticationHandler.SchemeName, null);

        // Configure authorization
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        // Rejected credentials count against the anonymous rate limit (see handler)
        services.AddSingleton<IAuthorizationMiddlewareResultHandler, RateLimitedAuthorizationResultHandler>();

        return services;
    }

    public static IServiceCollection AddTrendWeightServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure unified app options
        services.Configure<AppOptions>(configuration);

        // Register Supabase services
        services.AddSingleton<ISupabaseService, SupabaseService>();

        // Register the Clerk management API client as a typed client, so its
        // HttpClient comes from the factory (rotating handlers) per resolution
        // instead of one transient client being captured for the process lifetime.
        services.AddHttpClient<IClerkService, ClerkService>();

        // Register feature services
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IApiKeyService, ApiKeyService>();
        services.AddScoped<IProviderLinkService, ProviderLinkService>();
        services.AddScoped<ISourceDataService, SourceDataService>();
        services.AddScoped<IMeasurementSyncService, MeasurementSyncService>();
        services.AddScoped<IMeasurementComputationService, MeasurementComputationService>();
        services.AddScoped<IMeasurementOrchestrationService, MeasurementOrchestrationService>();
        services.AddScoped<ILegacyDbService, LegacyDbService>();
        services.AddScoped<ILegacyMigrationService, LegacyMigrationService>();

        // Register Withings service
        services.AddHttpClient<WithingsService>();
        services.AddScoped<IWithingsService>(sp => sp.GetRequiredService<WithingsService>());
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<WithingsService>());

        // Register Fitbit service
        services.AddHttpClient<FitbitService>();
        services.AddScoped<IFitbitService>(sp => sp.GetRequiredService<FitbitService>());
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<FitbitService>());

        // Register Legacy service
        services.AddScoped<LegacyService>();
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<LegacyService>());

        // Register Manual service
        services.AddScoped<ManualService>();
        services.AddScoped<IProviderService>(sp => sp.GetRequiredService<ManualService>());
        services.AddScoped<IManualDataService, ManualDataService>();

        // Register provider integration orchestrator
        services.AddScoped<IProviderIntegrationService, ProviderIntegrationService>();

        // Register per-request context
        services.AddScoped<ICurrentRequestContext, CurrentRequestContext>();

        // Register sync progress reporter
        services.AddScoped<ISyncProgressReporter, SyncProgressService>();

        return services;
    }
}
