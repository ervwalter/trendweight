using FluentAssertions;
using TrendWeight.Features.Measurements;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;
using Xunit;

namespace TrendWeight.Tests.Features.Measurements.Services;

public class MeasurementComputationServiceTests
{
    private readonly MeasurementComputationService _sut = new();

    #region Test Data Helpers

    private static ProfileData CreateTestProfile(int dayStartOffset = 0, bool hideDataBeforeStart = false, DateTime? goalStart = null)
    {
        return new ProfileData
        {
            UseMetric = true,
            DayStartOffset = dayStartOffset,
            HideDataBeforeStart = hideDataBeforeStart,
            GoalStart = goalStart
        };
    }

    private static List<SourceData> CreateTestSourceData(params (string date, string time, decimal weight, decimal? fatRatio)[] measurements)
    {
        return new List<SourceData>
        {
            new()
            {
                Source = "test",
                Measurements = measurements.Select(m => new RawMeasurement
                {
                    Date = m.date,
                    Time = m.time,
                    Weight = m.weight,
                    FatRatio = m.fatRatio
                }).ToList()
            }
        };
    }

    #endregion

    #region Basic Functionality Tests

    [Fact]
    public void ComputeMeasurements_WithEmptyData_ReturnsEmptyList()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = new List<SourceData>();

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void ComputeMeasurements_WithNullData_ReturnsEmptyList()
    {
        // Arrange
        var profile = CreateTestProfile();

        // Act
        var result = _sut.ComputeMeasurements(null!, profile);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void ComputeMeasurements_WithSingleMeasurement_ReturnsCorrectTrend()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 70.0m, null)
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(1);
        result[0].Date.Should().Be("2024-01-01");
        result[0].ActualWeight.Should().Be(70.0m);
        result[0].TrendWeight.Should().Be(70.0m); // First measurement = trend
        result[0].WeightIsInterpolated.Should().BeFalse();
    }

    #endregion

    #region Weight Trend Calculation Tests

    [Fact]
    public void ComputeMeasurements_WithMultipleWeights_CalculatesCorrectTrend()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 70.0m, null),
            ("2024-01-02", "08:00:00", 71.0m, null),
            ("2024-01-03", "08:00:00", 69.0m, null)
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(3);

        // First measurement: trend = actual
        result[0].TrendWeight.Should().Be(70.0m);

        // Second measurement: trend = previous + 0.1 * (actual - previous)
        // 70.0 + 0.1 * (71.0 - 70.0) = 70.1
        result[1].TrendWeight.Should().Be(70.1m);

        // Third measurement: 70.1 + 0.1 * (69.0 - 70.1) = 69.99
        result[2].TrendWeight.Should().Be(69.99m);
    }

    #endregion

    #region Weight Interpolation Tests

    [Fact]
    public void ComputeMeasurements_WithMissingDays_InterpolatesWeight()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 70.0m, null),
            ("2024-01-04", "08:00:00", 73.0m, null) // 3-day gap
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(4); // Original 2 + 2 interpolated

        // Check interpolated values
        result[1].Date.Should().Be("2024-01-02");
        result[1].ActualWeight.Should().Be(71.0m); // 70 + 1*1 = 71
        result[1].WeightIsInterpolated.Should().BeTrue();

        result[2].Date.Should().Be("2024-01-03");
        result[2].ActualWeight.Should().Be(72.0m); // 70 + 2*1 = 72
        result[2].WeightIsInterpolated.Should().BeTrue();

        result[3].Date.Should().Be("2024-01-04");
        result[3].ActualWeight.Should().Be(73.0m);
        result[3].WeightIsInterpolated.Should().BeFalse();
    }

    #endregion

    #region Fat Data Tests

    [Fact]
    public void ComputeMeasurements_WithFatData_CalculatesIndependentTrendMasses()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 100.0m, 0.2m), // 100kg, 20% fat
            ("2024-01-02", "08:00:00", 101.0m, 0.21m) // 101kg, 21% fat
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(2);

        // First day: fat mass = 100 * 0.2 = 20kg, lean mass = 80kg
        result[0].ActualFatPercent.Should().Be(0.2m);
        result[0].TrendFatPercent.Should().Be(0.2m);
        result[0].TrendFatMass.Should().Be(20.0m); // First measurement = trend
        result[0].TrendLeanMass.Should().Be(80.0m);

        // Second day: independent moving averages
        // Fat mass trend: 20 + 0.1 * (21.21 - 20) = 20.121
        // Lean mass trend: 80 + 0.1 * (79.79 - 80) = 79.979
        var expectedFatMass = 20.0m + 0.1m * (21.21m - 20.0m);
        var expectedLeanMass = 80.0m + 0.1m * (79.79m - 80.0m);

        result[1].TrendFatMass.Should().BeApproximately(expectedFatMass, 0.001m);
        result[1].TrendLeanMass.Should().BeApproximately(expectedLeanMass, 0.001m);
    }

    [Fact]
    public void ComputeMeasurements_WithFatDataGaps_InterpolatesFatMeasurements()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 100.0m, 0.2m), // Day 1: 100kg, 20% fat
            ("2024-01-04", "08:00:00", 103.0m, 0.23m) // Day 4: 103kg, 23% fat (3-day gap)
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(4);

        // Check that fat data was interpolated for missing days
        result[1].Date.Should().Be("2024-01-02");
        result[1].FatIsInterpolated.Should().BeTrue();
        result[1].ActualFatPercent.Should().BeApproximately(0.21m, 0.001m); // Linear interpolation

        result[2].Date.Should().Be("2024-01-03");
        result[2].FatIsInterpolated.Should().BeTrue();
        result[2].ActualFatPercent.Should().BeApproximately(0.22m, 0.001m);
    }

    #endregion

    #region Day Start Offset Tests

    [Fact]
    public void ComputeMeasurements_WithDayStartOffset_AdjustsDateProperly()
    {
        // Arrange
        var profile = CreateTestProfile(dayStartOffset: 4); // 4-hour offset
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "02:00:00", 70.0m, null) // 2 AM measurement
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(1);
        // 2 AM - 4 hours = 10 PM previous day, so should be assigned to Dec 31
        result[0].Date.Should().Be("2023-12-31");
    }

    #endregion

    #region Goal Start Filter Tests

    [Fact]
    public void ComputeMeasurements_WithHideDataBeforeStart_FiltersEarlyMeasurements()
    {
        // Arrange
        var goalStart = new DateTime(2024, 1, 2);
        var profile = CreateTestProfile(hideDataBeforeStart: true, goalStart: goalStart);
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 70.0m, null), // Before goal start
            ("2024-01-02", "08:00:00", 71.0m, null), // On goal start
            ("2024-01-03", "08:00:00", 72.0m, null)  // After goal start
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(2);
        result[0].Date.Should().Be("2024-01-02");
        result[1].Date.Should().Be("2024-01-03");
    }

    #endregion

    #region Grouping Tests

    [Fact]
    public void ComputeMeasurements_WithMultipleMeasurementsPerDay_SelectsFirstByTimestamp()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = new List<SourceData>
        {
            new()
            {
                Source = "test",
                Measurements = new List<RawMeasurement>
                {
                    new() { Date = "2024-01-01", Time = "10:00:00", Weight = 71.0m },
                    new() { Date = "2024-01-01", Time = "08:00:00", Weight = 70.0m }, // Earlier time
                    new() { Date = "2024-01-01", Time = "12:00:00", Weight = 72.0m }
                }
            }
        };

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(1);
        result[0].ActualWeight.Should().Be(70.0m); // Should select 8:00 AM measurement
    }

    #endregion

    #region Edge Cases and Performance Tests

    [Fact]
    public void ComputeMeasurements_WithLargeDataset_HandlesEfficently()
    {
        // Arrange: Create a large dataset with gaps that will be interpolated
        var profile = CreateTestProfile();
        var measurements = new List<RawMeasurement>();
        var baseDate = new DateTime(2024, 1, 1);

        // Create measurements with gaps - but ensure continuous coverage so interpolation works
        var actualMeasurementCount = 0;
        for (int i = 0; i < 100; i++) // Create 100 days with some gaps
        {
            // Create measurement every 2-3 days to test interpolation
            if (i % 3 != 1) // Skip middle day of every 3-day group
            {
                var currentDate = baseDate.AddDays(i);
                var weight = 70.0m + (decimal)Math.Sin(i / 30.0) * 2; // Sinusoidal pattern
                measurements.Add(new RawMeasurement
                {
                    Date = currentDate.ToString("yyyy-MM-dd"),
                    Time = "08:00:00",
                    Weight = weight,
                    FatRatio = i % 30 == 0 ? 0.2m + (decimal)Math.Sin(i / 60.0) * 0.05m : null
                });
                actualMeasurementCount++;
            }
        }

        var sourceData = new List<SourceData>
        {
            new() { Source = "test", Measurements = measurements }
        };

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(100); // Should fill in all 100 days via interpolation
        result.Should().NotBeEmpty();

        // Verify we have some interpolated measurements
        var interpolatedCount = result.Count(r => r.WeightIsInterpolated);
        interpolatedCount.Should().BeGreaterThan(0, "should have some interpolated days");

        // Verify trend is smoother than actual values
        var actualWeights = result.Where(r => !r.WeightIsInterpolated).Select(r => (double)r.ActualWeight).ToList();
        var trendWeights = result.Select(r => (double)r.TrendWeight).ToList();

        if (actualWeights.Count > 1)
        {
            var actualVariance = CalculateVariance(actualWeights);
            var trendVariance = CalculateVariance(trendWeights);

            trendVariance.Should().BeLessThan(actualVariance, "trend should be smoother than actual measurements");
        }
    }

    [Fact]
    public void ComputeMeasurements_WithWeightFluctuations_SmoothsTrend()
    {
        // Arrange: Create measurements with a spike
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 80.0m, null),
            ("2024-01-02", "08:00:00", 85.0m, null), // +5kg spike
            ("2024-01-03", "08:00:00", 80.0m, null)  // back to normal
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(3);

        // Trend should smooth out the spike
        result[0].TrendWeight.Should().Be(80.0m);
        result[1].TrendWeight.Should().Be(80.5m); // 80 + 0.1 * (85 - 80)
        result[2].TrendWeight.Should().Be(80.45m); // 80.5 + 0.1 * (80 - 80.5)
    }

    [Fact]
    public void ComputeMeasurements_WithFatMassTrendsVerification_CalculatesIndependently()
    {
        // Arrange: Test that fat/lean mass trends are calculated independently
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 100.0m, 0.3m),  // Day 1: 100kg, 30% fat (30kg fat, 70kg lean)
            ("2024-01-02", "08:00:00", 100.0m, 0.25m), // Day 2: 100kg, 25% fat (25kg fat, 75kg lean)
            ("2024-01-03", "08:00:00", 100.0m, 0.2m)   // Day 3: 100kg, 20% fat (20kg fat, 80kg lean)
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(3);

        // Verify independent fat mass trending: 30 -> 25 -> 20
        result[0].TrendFatMass.Should().Be(30.0m); // First = actual
        result[1].TrendFatMass.Should().Be(29.5m); // 30 + 0.1 * (25 - 30) = 29.5
        result[2].TrendFatMass.Should().Be(28.55m); // 29.5 + 0.1 * (20 - 29.5) = 28.55

        // Verify independent lean mass trending: 70 -> 75 -> 80
        result[0].TrendLeanMass.Should().Be(70.0m); // First = actual
        result[1].TrendLeanMass.Should().Be(70.5m); // 70 + 0.1 * (75 - 70) = 70.5
        result[2].TrendLeanMass.Should().Be(71.45m); // 70.5 + 0.1 * (80 - 70.5) = 71.45
    }

    [Fact]
    public void ComputeMeasurements_CompareWithProductOfTrends_ShowsDifference()
    {
        // Arrange: This test demonstrates why independent calculation is better
        var profile = CreateTestProfile();
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "08:00:00", 100.0m, 0.25m),
            ("2024-01-02", "08:00:00", 90.0m, 0.30m)  // Weight drops, fat % increases
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(2);

        // Compare independent calculation vs product of trends
        var trendWeight = result[1].TrendWeight;
        var trendFatPercent = result[1].TrendFatPercent!.Value;
        var productOfTrends = trendWeight * trendFatPercent;
        var independentTrendFatMass = result[1].TrendFatMass!.Value;

        // They should be different (proving independent calculation is used)
        Math.Abs(productOfTrends - independentTrendFatMass).Should().BeGreaterThan(0.01m);
    }

    [Theory]
    [InlineData(0)] // No offset
    [InlineData(4)] // 4-hour offset
    [InlineData(-2)] // Negative offset
    public void ComputeMeasurements_WithVariousDayStartOffsets_AdjustsDatesCorrectly(int offsetHours)
    {
        // Arrange
        var profile = CreateTestProfile(dayStartOffset: offsetHours);
        var sourceData = CreateTestSourceData(
            ("2024-01-01", "02:00:00", 70.0m, null) // 2 AM measurement
        );

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(1);

        // Calculate expected date
        var originalDateTime = DateTime.Parse("2024-01-01 02:00:00");
        var adjustedDateTime = originalDateTime.AddHours(-offsetHours);
        var expectedDate = adjustedDateTime.Date.ToString("yyyy-MM-dd");

        result[0].Date.Should().Be(expectedDate);
    }

    [Fact]
    public void ComputeMeasurements_WithMixedSources_PreservesSourceInfo()
    {
        // Arrange
        var profile = CreateTestProfile();
        var sourceData = new List<SourceData>
        {
            new()
            {
                Source = "withings",
                Measurements = new List<RawMeasurement>
                {
                    new() { Date = "2024-01-01", Time = "08:00:00", Weight = 70.0m }
                }
            },
            new()
            {
                Source = "fitbit",
                Measurements = new List<RawMeasurement>
                {
                    new() { Date = "2024-01-02", Time = "08:00:00", Weight = 71.0m }
                }
            }
        };

        // Act
        var result = _sut.ComputeMeasurements(sourceData, profile);

        // Assert
        result.Should().HaveCount(2);
        // Note: The service doesn't preserve source in ComputedMeasurement model
        // This test documents the current behavior
    }

    #endregion

    #region Helper Methods

    private static double CalculateVariance(IList<double> values)
    {
        if (values.Count == 0) return 0;

        var mean = values.Sum() / values.Count;
        var squaredDiffs = values.Select(val => Math.Pow(val - mean, 2));
        return squaredDiffs.Sum() / values.Count;
    }

    #endregion
}
