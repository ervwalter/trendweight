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

        Guid uid;

        if (existingProfile != null)
        {
            // Check if a user account already exists with this UID
            var existingUserAccount = await GetByInternalIdAsync(existingProfile.Uid);
            if (existingUserAccount != null)
            {
                // CRITICAL: If the existing user account has a different external ID,
                // we have a conflict - the same email is being used by different users.
                // This should not update the existing mapping as that would hijack another user's account.
                if (existingUserAccount.ExternalId != externalId || existingUserAccount.Provider != provider)
                {
                    _logger.LogWarning("Email {Email} is already associated with a different user account. ExistingUID: {ExistingUid}, ExistingExternalId: {ExistingExternalId}, NewExternalId: {NewExternalId}",
                        email, existingProfile.Uid, existingUserAccount.ExternalId, externalId);

                    // Create a new UID for this user instead of hijacking the existing account
                    uid = Guid.NewGuid();
                    _logger.LogInformation("Creating new user account with UID {Uid} for {Provider}:{ExternalId} due to email conflict", uid, provider, externalId);
                }
                else
                {
                    // User account already exists with same external ID - this is fine
                    return existingUserAccount;
                }
            }
            else
            {
                // Profile exists but no user account - use existing profile UID
                uid = existingProfile.Uid;
            }
        }
        else
        {
            // Generate new UID
            uid = Guid.NewGuid();
        }

        var now = DateTime.UtcNow.ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", System.Globalization.CultureInfo.InvariantCulture);

        var userAccount = new DbUserAccount
        {
            Uid = uid,
            ExternalId = externalId,
            Provider = provider,
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

    public async Task<bool> DeleteByInternalIdAsync(Guid uid)
    {
        try
        {
            // First get the user account to delete
            var userAccount = await GetByInternalIdAsync(uid);
            if (userAccount == null)
            {
                _logger.LogWarning("No user account found to delete with UID {Uid}", uid);
                return false;
            }

            await _supabaseService.DeleteAsync(userAccount);
            _logger.LogInformation("Deleted user account with UID {Uid}", uid);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user account with UID {Uid}", uid);
            throw;
        }
    }
}
