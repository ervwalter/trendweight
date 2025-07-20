using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Supabase.Interfaces;
using Supabase.Postgrest.Models;
using Supabase.Realtime;
using TrendWeight.Infrastructure.DataAccess;

namespace TrendWeight.Tests.Fixtures;

public class IntegrationTestBase : IClassFixture<TestWebApplicationFactory>, IDisposable
{
    protected TestWebApplicationFactory Factory { get; }
    protected HttpClient Client { get; }

    public IntegrationTestBase(TestWebApplicationFactory factory)
    {
        Factory = factory;
        Client = Factory.CreateClient();
    }

    protected T GetService<T>() where T : class
    {
        var scope = Factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<T>();
    }

    public void Dispose()
    {
        Client?.Dispose();
    }
}

public class TestWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Remove real Supabase service
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(ISupabaseService));
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }

            // Add test doubles
            services.AddSingleton<ISupabaseService, TestSupabaseService>();
        });

        builder.UseEnvironment("Test");
    }
}

public class TestSupabaseService : ISupabaseService
{
    private readonly Dictionary<Type, List<object>> _data = new();

    public Task<T?> GetByIdAsync<T>(Guid id) where T : BaseModel, new()
    {
        if (!_data.ContainsKey(typeof(T)))
            return Task.FromResult<T?>(null);

        var item = _data[typeof(T)]
            .Cast<T>()
            .FirstOrDefault(x => GetIdProperty(x)?.Equals(id) ?? false);

        return Task.FromResult(item);
    }

    public Task<T?> GetByIdAsync<T>(string id) where T : BaseModel, new()
    {
        if (Guid.TryParse(id, out var guid))
            return GetByIdAsync<T>(guid);

        return Task.FromResult<T?>(null);
    }

    public Task<List<T>> GetAllAsync<T>() where T : BaseModel, new()
    {
        if (!_data.ContainsKey(typeof(T)))
            return Task.FromResult(new List<T>());

        return Task.FromResult(_data[typeof(T)].Cast<T>().ToList());
    }

    public Task<T> InsertAsync<T>(T entity) where T : BaseModel, new()
    {
        if (!_data.ContainsKey(typeof(T)))
            _data[typeof(T)] = new List<object>();

        _data[typeof(T)].Add(entity);
        return Task.FromResult(entity);
    }

    public Task<T> UpdateAsync<T>(T entity) where T : BaseModel, new()
    {
        // For simplicity, just return the entity
        return Task.FromResult(entity);
    }

    public Task DeleteAsync<T>(T entity) where T : BaseModel, new()
    {
        if (_data.ContainsKey(typeof(T)))
            _data[typeof(T)].Remove(entity);

        return Task.CompletedTask;
    }

    public Task<List<T>> QueryAsync<T>(Action<ISupabaseTable<T, RealtimeChannel>> query) where T : BaseModel, new()
    {
        // For test purposes, just return all items
        return GetAllAsync<T>();
    }

    public Task<bool> DeleteAuthUserAsync(Guid userId)
    {
        // Simulate auth deletion
        return Task.FromResult(true);
    }

    private static object? GetIdProperty(object obj)
    {
        var prop = obj.GetType().GetProperty("Uid") ?? obj.GetType().GetProperty("Id");
        return prop?.GetValue(obj);
    }
}
