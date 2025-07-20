using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;

namespace TrendWeight.Tests.Fixtures;

public abstract class TestBase : IDisposable
{
    protected IServiceProvider ServiceProvider { get; }
    protected IServiceCollection Services { get; }

    protected TestBase()
    {
        Services = new ServiceCollection();
        ConfigureServices(Services);
        ServiceProvider = Services.BuildServiceProvider();
    }

    protected virtual void ConfigureServices(IServiceCollection services)
    {
        // Add common test services
        services.AddLogging(builder => builder.AddConsole());
    }

    protected Mock<ILogger<T>> CreateLoggerMock<T>() => new();

    protected T GetService<T>() where T : class => ServiceProvider.GetRequiredService<T>();

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (disposing && ServiceProvider is IDisposable disposable)
        {
            disposable.Dispose();
        }
    }
}