using Supabase.Postgrest.Models;
using Supabase.Interfaces;
using Supabase.Realtime;

namespace TrendWeight.Infrastructure.DataAccess;

public interface ISupabaseService
{
    Task<T?> GetByIdAsync<T>(Guid id) where T : BaseModel, new();
    Task<T?> GetByIdAsync<T>(string id) where T : BaseModel, new();
    Task<List<T>> GetAllAsync<T>() where T : BaseModel, new();
    Task<T> InsertAsync<T>(T model) where T : BaseModel, new();
    Task<T> UpdateAsync<T>(T model) where T : BaseModel, new();
    Task DeleteAsync<T>(T model) where T : BaseModel, new();
    Task<List<T>> QueryAsync<T>(Action<ISupabaseTable<T, RealtimeChannel>> query) where T : BaseModel, new();
    Task<bool> DeleteAuthUserAsync(Guid userId);
    Task<bool> BroadcastAsync(string topic, string eventName, object payload);
}
