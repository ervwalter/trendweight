using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using TrendWeight.Infrastructure.Auth;
using TrendWeight.Infrastructure.Middleware;
using TrendWeight.Features.Providers;
using TrendWeight.Features.Providers.Withings;
using TrendWeight.Features.Providers.Fitbit;
using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Features.ProviderLinks.Services;
using TrendWeight.Features.Measurements;
using TrendWeight.Infrastructure.Configuration;
using TrendWeight.Infrastructure.Services;

namespace TrendWeight.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{

    public static IServiceCollection AddSupabaseAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Configure app options (will be used by authentication handler)
        services.Configure<AppOptions>(configuration);

        // Add token service
        services.AddSingleton<ISupabaseTokenService, SupabaseTokenService>();

        // Configure authentication - Supabase only
        services.AddAuthentication("Supabase")
            .AddScheme<SupabaseAuthenticationSchemeOptions, SupabaseAuthenticationHandler>("Supabase", null);

        // Configure authorization
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }

    public static IServiceCollection AddClerkAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Configure app options (will be used by authentication handler)
        services.Configure<AppOptions>(configuration);

        // Add Clerk services
        services.AddHttpClient<ClerkTokenService>();
        services.AddSingleton<IClerkTokenService, ClerkTokenService>();
        services.AddScoped<IUserAccountMappingService, UserAccountMappingService>();

        // Configure authentication - Clerk only
        services.AddAuthentication("Clerk")
            .AddScheme<AuthenticationSchemeOptions, ClerkAuthenticationHandler>("Clerk", null);

        // Configure authorization
        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build();
        });

        return services;
    }

    public static IServiceCollection AddTrendWeightServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Configure unified app options
        services.Configure<AppOptions>(configuration);

        // Register Supabase services
        services.AddSingleton<ISupabaseService, SupabaseService>();

        // Register Clerk services
        services.AddHttpClient<ClerkService>();
        services.AddSingleton<IClerkService, ClerkService>();

        // Register feature services
        services.AddScoped<IProfileService, ProfileService>();
        services.AddScoped<IProviderLinkService, ProviderLinkService>();
        services.AddScoped<ISourceDataService, SourceDataService>();
        services.AddScoped<IMeasurementSyncService, MeasurementSyncService>();
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

        // Register provider integration orchestrator
        services.AddScoped<IProviderIntegrationService, ProviderIntegrationService>();

        return services;
    }
}
