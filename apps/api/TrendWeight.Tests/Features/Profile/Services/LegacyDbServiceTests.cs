using FluentAssertions;
using Microsoft.Extensions.Logging;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Services;
using TrendWeight.Infrastructure.DataAccess.Models;
using TrendWeight.Tests.Fixtures;

namespace TrendWeight.Tests.Features.Profile.Services;

public class LegacyDbServiceTests
{
    private readonly FakeSupabaseService _supabase = new();
    private readonly CapturingLoggerProvider _logs = new();
    private readonly LegacyDbService _sut;

    public LegacyDbServiceTests()
    {
        // The "not found" path logs at Debug, below the factory's default minimum level.
        var factory = LoggerFactory.Create(builder => builder.AddProvider(_logs).SetMinimumLevel(LogLevel.Debug));
        _sut = new LegacyDbService(_supabase, factory.CreateLogger<LegacyDbService>());
    }

    [Fact]
    public async Task FindProfileByEmailAsync_MapsEveryFieldOfTheMatchingRow()
    {
        var measurements = new List<RawMeasurement>
        {
            new() { Date = "2024-01-01", Time = "07:00:00", Weight = 80.5m, FatRatio = 0.25m },
            new() { Date = "2024-01-02", Time = "07:05:00", Weight = 80.1m }
        };
        _supabase.Seed(
            new DbLegacyProfile { Email = "other@example.com", FirstName = "Other", PrivateUrlKey = "other-key" },
            new DbLegacyProfile
            {
                Email = "legacy@example.com",
                Username = "legacyuser",
                FirstName = "Legacy",
                UseMetric = true,
                StartDate = new DateTime(2023, 6, 1, 0, 0, 0, DateTimeKind.Utc),
                GoalWeight = 72.5m,
                PlannedPoundsPerWeek = 1.5m,
                DayStartOffset = -2,
                PrivateUrlKey = "private-key",
                DeviceType = "withings",
                RefreshToken = "refresh-token",
                Measurements = measurements,
                CreatedAt = new DateTime(2020, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                UpdatedAt = new DateTime(2021, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            });

        var result = await _sut.FindProfileByEmailAsync("legacy@example.com");

        result.Should().NotBeNull();
        result!.Email.Should().Be("legacy@example.com");
        result.Username.Should().Be("legacyuser");
        result.FirstName.Should().Be("Legacy");
        result.UseMetric.Should().BeTrue();
        result.StartDate.Should().Be(new DateTime(2023, 6, 1, 0, 0, 0, DateTimeKind.Utc));
        result.GoalWeight.Should().Be(72.5m);
        result.PlannedPoundsPerWeek.Should().Be(1.5m);
        result.DayStartOffset.Should().Be(-2);
        result.PrivateUrlKey.Should().Be("private-key");
        result.DeviceType.Should().Be("withings");
        result.RefreshToken.Should().Be("refresh-token");
        result.Measurements.Should().BeSameAs(measurements);
        _logs.ShouldHaveLogged(LogLevel.Information, "Found legacy profile for email legacy@example.com");
    }

    [Fact]
    public async Task FindProfileByEmailAsync_ReturnsNull_WhenOnlyOtherEmailsExist()
    {
        _supabase.Seed(new DbLegacyProfile { Email = "other@example.com", FirstName = "Other" });

        var result = await _sut.FindProfileByEmailAsync("legacy@example.com");

        result.Should().BeNull();
        _logs.ShouldHaveLogged(LogLevel.Debug, "No legacy profile found for email legacy@example.com");
        _logs.ShouldNotHaveLogged(LogLevel.Error);
    }

    [Fact]
    public async Task FindProfileByEmailAsync_ReturnsNullAndLogsTheError_WhenTheQueryFails()
    {
        var failure = new HttpRequestException("Database unavailable");
        _supabase.ThrowOnQuery = failure;

        var result = await _sut.FindProfileByEmailAsync("legacy@example.com");

        result.Should().BeNull();
        _logs.Entries.Should().ContainSingle(e => e.Level == LogLevel.Error)
            .Which.Should().Match<CapturingLoggerProvider.LogEntry>(e =>
                e.Exception == failure && e.Message.Contains("Error accessing legacy profile for email legacy@example.com"));
    }
}
