using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Records every log entry so tests can assert on what a host or middleware wrote.
/// </summary>
public sealed class CapturingLoggerProvider : ILoggerProvider
{
    public ConcurrentQueue<LogEntry> Entries { get; } = new();

    public ILogger CreateLogger(string categoryName) => new CapturingLogger(categoryName, Entries);

    public ILogger<T> CreateLogger<T>() => LoggerFactory.Create(builder => builder.AddProvider(this)).CreateLogger<T>();

    public void Dispose()
    {
    }

    /// <summary>
    /// One captured log call. <see cref="State"/> holds the structured message
    /// properties (including the original template under <c>{OriginalFormat}</c>)
    /// when the logger state exposes them, otherwise it is empty.
    /// </summary>
    public sealed record LogEntry(
        string Category,
        LogLevel Level,
        string Message,
        Exception? Exception,
        IReadOnlyList<KeyValuePair<string, object?>> State);

    private sealed class CapturingLogger(string category, ConcurrentQueue<LogEntry> entries) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var values = state is IReadOnlyList<KeyValuePair<string, object?>> pairs
                ? pairs.ToArray()
                : [];

            entries.Enqueue(new LogEntry(category, logLevel, formatter(state, exception), exception, values));
        }
    }
}
