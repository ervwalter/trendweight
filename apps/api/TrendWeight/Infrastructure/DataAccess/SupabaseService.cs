using Microsoft.Extensions.Options;
using Supabase;
using Supabase.Postgrest.Models;
using System.Text;
using System.Text.Json;
using TrendWeight.Infrastructure.Configuration;

namespace TrendWeight.Infrastructure.DataAccess;

public class SupabaseService : ISupabaseService
{
    private readonly Lazy<Client> _supabaseClient;
    private readonly SupabaseConfig _config;
    private readonly ILogger<SupabaseService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly JsonSerializerOptions _jsonOptions;
    private Client SupabaseClient => _supabaseClient.Value;

    public SupabaseService(IOptions<AppOptions> appOptions, ILogger<SupabaseService> logger, IHttpClientFactory httpClientFactory)
    {
        _config = appOptions.Value.Supabase;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        _supabaseClient = new Lazy<Client>(() =>
        {
            var options = new SupabaseOptions
            {
                AutoRefreshToken = true,
                AutoConnectRealtime = false
            };

            var client = new Client(_config.Url, _config.ServiceKey, options);

            // Use GetAwaiter().GetResult() instead of Wait() to avoid deadlock
            client.InitializeAsync().GetAwaiter().GetResult();

            return client;
        });
    }

    public async Task<T?> GetByIdAsync<T>(Guid id) where T : BaseModel, new()
    {
        try
        {
            var query = SupabaseClient.From<T>()
                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, id.ToString());

            var response = await query.Get();

            if (response.Models.Count == 0)
            {
                return null;
            }

            if (response.Models.Count > 1)
            {
                _logger.LogError("Multiple {Type} records found with ID {Id}", typeof(T).Name, id);
                return null;
            }

            return response.Models.First();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting {Type} by ID {Id}", typeof(T).Name, id);
            return null;
        }
    }

    public async Task<T?> GetByIdAsync<T>(string id) where T : BaseModel, new()
    {
        try
        {
            var response = await SupabaseClient.From<T>()
                .Filter("uid", Supabase.Postgrest.Constants.Operator.Equals, id)
                .Get();

            if (response.Models.Count == 0)
            {
                // Not found - this is an expected scenario, not an error
                _logger.LogDebug("{Type} not found with ID {Id}", typeof(T).Name, id);
                return null;
            }

            if (response.Models.Count > 1)
            {
                // Multiple records found - this is an error
                _logger.LogError("Multiple {Type} records found with ID {Id}", typeof(T).Name, id);
                return null;
            }

            return response.Models.First();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting {Type} by ID {Id}", typeof(T).Name, id);
            return null;
        }
    }


    public async Task<T> InsertAsync<T>(T model) where T : BaseModel, new()
    {
        try
        {
            var response = await SupabaseClient.From<T>()
                .Insert(model, new Supabase.Postgrest.QueryOptions { Upsert = false });

            return response.Models.First();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error inserting {Type}", typeof(T).Name);
            throw;
        }
    }

    public async Task<T> UpdateAsync<T>(T model) where T : BaseModel, new()
    {
        try
        {
            var response = await SupabaseClient.From<T>()
                .Update(model);

            return response.Models.First();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating {Type}", typeof(T).Name);
            throw;
        }
    }

    public async Task DeleteAsync<T>(T model) where T : BaseModel, new()
    {
        try
        {
            await SupabaseClient.From<T>()
                .Delete(model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting {Type}", typeof(T).Name);
            throw;
        }
    }

    public async Task<List<T>> QueryAsync<T>(Action<Supabase.Interfaces.ISupabaseTable<T, Supabase.Realtime.RealtimeChannel>> query) where T : BaseModel, new()
    {
        try
        {
            var table = SupabaseClient.From<T>();
            query(table);
            var response = await table.Get();

            if (response.Models.Count == 0)
            {
                _logger.LogDebug("Query returned no {Type} records", typeof(T).Name);
            }

            return response.Models;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error querying {Type}", typeof(T).Name);
            return new List<T>();
        }
    }

    public async Task<bool> DeleteAuthUserAsync(Guid userId)
    {
        try
        {
            // Supabase Auth Admin API endpoint for deleting users
            var url = $"{_config.Url}/auth/v1/admin/users/{userId}";

            using var request = new HttpRequestMessage(HttpMethod.Delete, url);
            request.Headers.Add("apikey", _config.ServiceKey);
            request.Headers.Add("Authorization", $"Bearer {_config.ServiceKey}");

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully deleted auth user {UserId}", userId);
                return true;
            }

            var errorContent = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to delete auth user {UserId}. Status: {StatusCode}, Error: {Error}",
                userId, response.StatusCode, errorContent);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting auth user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> BroadcastAsync(string topic, string eventName, object payload)
    {
        try
        {
            var broadcastPayload = new
            {
                messages = new[]
                {
                    new
                    {
                        topic,
                        @event = eventName,
                        payload
                    }
                }
            };

            var json = JsonSerializer.Serialize(broadcastPayload, _jsonOptions);

            var url = $"{_config.Url}/realtime/v1/api/broadcast";

            using var request = new HttpRequestMessage(HttpMethod.Post, url);
            request.Headers.Add("apikey", _config.ServiceKey);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");

            using var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Successfully broadcast message to topic {Topic} with event {Event}", topic, eventName);
                return true;
            }

            var responseBody = await response.Content.ReadAsStringAsync();
            _logger.LogError("Failed to broadcast message. Status: {Status}, Response: {Response}",
                response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception occurred while broadcasting message to topic {Topic}", topic);
            return false;
        }
    }
}
