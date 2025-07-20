namespace TrendWeight.Features.Profile.Services;

public interface IAccountDeletionService
{
    /// <summary>
    /// Deletes a user account and all associated data
    /// </summary>
    /// <param name="userId">The user's Supabase UID</param>
    /// <returns>True if successful, false otherwise</returns>
    Task<bool> DeleteAccountAsync(Guid userId);
}
