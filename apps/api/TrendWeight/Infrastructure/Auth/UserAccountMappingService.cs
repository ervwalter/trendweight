using TrendWeight.Infrastructure.DataAccess;
using TrendWeight.Infrastructure.DataAccess.Models;

namespace TrendWeight.Infrastructure.Auth;

public class UserAccountMappingService : IUserAccountMappingService
{
    private readonly ISupabaseService _supabaseService;
    private readonly ILogger<UserAccountMappingService> _logger;

    public UserAccountMappingService(ISupabaseService supabaseService, ILogger<UserAccountMappingService> logger)
    {
        _supabaseService = supabaseService;
        _logger = logger;
    }

    public async Task<DbUserAccount?> GetByExternalIdAsync(string externalId, string provider = "clerk")
    {
        var results = await _supabaseService.QueryAsync<DbUserAccount>(query =>
            query.Where(x => x.ExternalId == externalId)
                 .Where(x => x.Provider == provider)
                 .Limit(1));

        return results.FirstOrDefault();
    }

    public async Task<DbUserAccount?> GetByInternalIdAsync(Guid uid)
    {
        return await _supabaseService.GetByIdAsync<DbUserAccount>(uid);
    }

    public async Task<DbUserAccount> CreateMappingAsync(string externalId, string email, string provider = "clerk")
    {
        // First check if a user exists with this email in the profiles table (existing Supabase user)
        var existingProfiles = await _supabaseService.QueryAsync<DbProfile>(query =>
            query.Where(x => x.Email == email)
                 .Limit(1));

        var existingProfile = existingProfiles.FirstOrDefault();

        // Use existing UID if found, otherwise generate new one
        var uid = existingProfile?.Uid ?? Guid.NewGuid();
        var now = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", System.Globalization.CultureInfo.InvariantCulture);

        var userAccount = new DbUserAccount
        {
            Uid = uid,
            ExternalId = externalId,
            Provider = provider,
            Email = email,
            CreatedAt = now,
            UpdatedAt = now
        };

        var result = await _supabaseService.InsertAsync(userAccount);

        _logger.LogInformation("Created user account mapping for {Provider} user {ExternalId} -> {Uid}", provider, externalId, uid);

        return result;
    }

    public async Task<DbUserAccount> GetOrCreateMappingAsync(string externalId, string email, string provider = "clerk")
    {
        var existing = await GetByExternalIdAsync(externalId, provider);
        if (existing != null)
        {
            return existing;
        }

        return await CreateMappingAsync(externalId, email, provider);
    }
}
