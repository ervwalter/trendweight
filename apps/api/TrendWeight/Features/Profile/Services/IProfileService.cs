using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Features.Profile.Services;

public interface IProfileService
{
    Task<DbProfile?> GetByIdAsync(Guid id);
    Task<DbProfile?> GetByIdAsync(string id); // Overload for string IDs (Supabase UIDs)
    Task<DbProfile> CreateAsync(DbProfile profile);
    Task<DbProfile> UpdateAsync(DbProfile profile);
    Task<DbProfile> UpdateOrCreateProfileAsync(string userId, string email, UpdateProfileRequest request);
    Task<DbProfile?> GetBySharingTokenAsync(string sharingToken);
    string GenerateShareToken();
    Task<string> GenerateUniqueShareTokenAsync();
    Task<DbProfile?> GenerateNewSharingTokenAsync(string userId);
    Task<bool> CompleteMigrationAsync(string userId);
    Task<bool> DeleteAccountAsync(Guid userId);
}
