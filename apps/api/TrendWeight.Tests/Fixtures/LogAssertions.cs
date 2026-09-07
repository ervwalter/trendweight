using FluentAssertions;
using FluentAssertions.Execution;
using Microsoft.Extensions.Logging;

namespace TrendWeight.Tests.Fixtures;

/// <summary>
/// Assertions over everything a <see cref="CapturingLoggerProvider"/> captured, across every category.
/// </summary>
public static class LogAssertions
{
    /// <summary>
    /// Asserts that at least one entry at <paramref name="level"/> has a message containing
    /// <paramref name="substring"/> (ordinal, case-sensitive).
    /// </summary>
    public static void ShouldHaveLogged(this CapturingLoggerProvider logs, LogLevel level, string substring)
    {
        logs.Entries.Should().Contain(
            e => e.Level == level && e.Message.Contains(substring, StringComparison.Ordinal),
            "expected a {0} log entry containing \"{1}\" but captured: {2}",
            level,
            substring,
            Describe(logs));
    }

    /// <summary>
    /// Asserts that nothing was logged at <paramref name="level"/> in any category.
    /// </summary>
    public static void ShouldNotHaveLogged(this CapturingLoggerProvider logs, LogLevel level)
    {
        logs.Entries.Should().NotContain(
            e => e.Level == level,
            "expected no {0} log entries but captured: {1}",
            level,
            Describe(logs));
    }

    /// <summary>
    /// Asserts that <paramref name="secret"/> does not appear in the message, the exception,
    /// or any structured state value of any entry in any category.
    /// </summary>
    public static void ShouldNotMention(this CapturingLoggerProvider logs, string secret)
    {
        ArgumentException.ThrowIfNullOrEmpty(secret);

        foreach (var entry in logs.Entries)
        {
            var where = Locate(entry, secret);
            if (where is null)
            {
                continue;
            }

            AssertionChain.GetOrCreate()
                .FailWith(
                    "Expected no log entry to mention {0}, but the {1} entry in {2} exposed it via its {3}: {4}",
                    secret,
                    entry.Level,
                    entry.Category,
                    where,
                    entry.Message);
            return;
        }
    }

    private static string? Locate(CapturingLoggerProvider.LogEntry entry, string secret)
    {
        if (entry.Message.Contains(secret, StringComparison.Ordinal))
        {
            return "message";
        }

        if (entry.Exception?.ToString().Contains(secret, StringComparison.Ordinal) == true)
        {
            return "exception";
        }

        foreach (var pair in entry.State)
        {
            if (pair.Value?.ToString()?.Contains(secret, StringComparison.Ordinal) == true)
            {
                return $"state value \"{pair.Key}\"";
            }
        }

        return null;
    }

    private static string Describe(CapturingLoggerProvider logs)
    {
        var entries = logs.Entries.ToArray();
        return entries.Length == 0
            ? "(no entries)"
            : string.Join("; ", entries.Select(e => $"[{e.Level}] {e.Category}: {e.Message}"));
    }
}
