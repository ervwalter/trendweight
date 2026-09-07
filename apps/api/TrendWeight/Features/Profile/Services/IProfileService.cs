using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Features.Profile.Services;

public interface IProfileService
{
    Task<DbProfile?> GetByIdAsync(Guid id);
    Task<DbProfile> CreateAsync(DbProfile profile);
    Task<DbProfile> UpdateAsync(DbProfile profile);
    Task<DbProfile> UpdateOrCreateProfileAsync(Guid userId, string email, UpdateProfileRequest request);
    Task<DbProfile?> GetBySharingTokenAsync(string sharingToken);
    Task<DbProfile?> GetByApiKeyHashAsync(string apiKeyHash);
    string GenerateShareToken();
    Task<string> GenerateUniqueShareTokenAsync();
    Task<DbProfile?> GenerateNewSharingTokenAsync(Guid userId);
    Task<bool> CompleteMigrationAsync(Guid userId);
    Task<bool> DeleteAccountAsync(Guid userId);
}
