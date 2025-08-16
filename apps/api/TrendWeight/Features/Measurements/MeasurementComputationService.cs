using System.Globalization;
using TrendWeight.Features.Measurements.Models;
using TrendWeight.Features.Profile.Models;

namespace TrendWeight.Features.Measurements;

/// <summary>
/// Service for computing measurements from raw source data
/// Contains all computation logic as private methods
/// </summary>
public class MeasurementComputationService : IMeasurementComputationService
{
    public List<ComputedMeasurement> ComputeMeasurements(
        List<SourceData> sourceData,
        ProfileData profile)
    {
        // Handle empty or null input gracefully
        if (sourceData == null || sourceData.Count == 0)
        {
            return new List<ComputedMeasurement>();
        }

        // Step 1: Convert raw data to source measurements with proper date/time handling
        var rawData = ConvertToSourceMeasurements(sourceData, profile);

        if (rawData.Count == 0)
        {
            return new List<ComputedMeasurement>();
        }

        // Step 2: Group by day and select first measurement of each day
        var sourceMeasurements = GroupAndSelectFirstByDay(rawData);

        // Step 3: Interpolate missing weight measurements
        sourceMeasurements = InterpolateWeightMeasurements(sourceMeasurements);

        // Step 4: Compute weight trends
        var measurements = ComputeWeightTrends(sourceMeasurements);

        // Step 5: Process fat measurements if available
        var fatSourceMeasurements = FilterAndGroupFatMeasurements(rawData);

        if (fatSourceMeasurements.Count > 0)
        {
            // Step 6: Interpolate missing fat measurements
            fatSourceMeasurements = InterpolateFatMeasurements(fatSourceMeasurements);

            // Step 7: Compute fat trends and update measurements
            measurements = ComputeFatTrends(fatSourceMeasurements, measurements);
        }

        return measurements;
    }

    /// <summary>
    /// Converts raw source data into source measurements with proper date/time handling
    /// Port of convertToSourceMeasurements from TypeScript
    /// </summary>
    private static List<SourceMeasurement> ConvertToSourceMeasurements(List<SourceData> sourceData, ProfileData profile)
    {
        var dayStartOffset = profile.DayStartOffset ?? 0;

        // Convert all measurements first
        var allMeasurements = sourceData
            .Where(data => data.Measurements != null)
            .SelectMany(sourceDataItem =>
                sourceDataItem.Measurements!.Select(rawMeasurement =>
                {
                    // Parse date and time to create DateTime
                    var dateTime = DateTime.Parse($"{rawMeasurement.Date} {rawMeasurement.Time}", CultureInfo.InvariantCulture);

                    // Apply dayStartOffset to determine which date this belongs to
                    var adjustedDateTime = dateTime.AddHours(-dayStartOffset);

                    return new SourceMeasurement
                    {
                        Date = adjustedDateTime.Date, // Use Date property for the adjusted date
                        Timestamp = adjustedDateTime, // Keep original for intra-day sorting
                        Source = sourceDataItem.Source,
                        Weight = rawMeasurement.Weight, // Already in kg, no conversion needed
                        FatRatio = rawMeasurement.FatRatio,
                        WeightIsInterpolated = false
                    };
                }))
            .ToList();

        // Filter if needed
        if (profile.HideDataBeforeStart && profile.GoalStart.HasValue)
        {
            var startDate = profile.GoalStart.Value.Date;
            allMeasurements = allMeasurements
                .Where(measurement => measurement.Date >= startDate)
                .ToList();
        }

        return allMeasurements;
    }

    /// <summary>
    /// Groups measurements by day and selects the first measurement of each day
    /// Port of groupAndSelectFirstByDay from TypeScript
    /// </summary>
    private static List<SourceMeasurement> GroupAndSelectFirstByDay(List<SourceMeasurement> measurements)
    {
        return measurements
            .GroupBy(m => m.Date.Date) // Group by date only (ignoring time)
            .Select(group => group
                .OrderBy(m => m.Timestamp) // Sort by timestamp within each day
                .First()) // Take the first (earliest) measurement of the day
            .OrderBy(m => m.Date) // Sort final result by date
            .ToList();
    }

    /// <summary>
    /// Filters measurements that have fat ratio data and groups them by day
    /// Port of filterAndGroupFatMeasurements from TypeScript
    /// </summary>
    private static List<SourceMeasurement> FilterAndGroupFatMeasurements(List<SourceMeasurement> measurements)
    {
        var fatMeasurements = measurements
            .Where(m => m.FatRatio.HasValue)
            .OrderBy(m => m.Timestamp)
            .ToList();

        return GroupAndSelectFirstByDay(fatMeasurements);
    }

    /// <summary>
    /// Interpolates missing weight measurements between existing measurements
    /// Port of interpolateWeightMeasurements from TypeScript
    /// </summary>
    private static List<SourceMeasurement> InterpolateWeightMeasurements(List<SourceMeasurement> measurements)
    {
        // Sort measurements by date first to ensure correct interpolation
        var sortedMeasurements = measurements.OrderBy(m => m.Date).ToList();
        var missingDays = new List<SourceMeasurement>();
        SourceMeasurement? previous = null;

        for (int i = 0; i < sortedMeasurements.Count; i++)
        {
            var currentWeight = sortedMeasurements[i];

            if (previous != null)
            {
                var daysBetween = (currentWeight.Date - previous.Date).Days;

                if (daysBetween > 1)
                {
                    var changePerDay = (currentWeight.Weight - previous.Weight) / daysBetween;
                    var weight = previous.Weight;

                    for (var date = previous.Date.AddDays(1); date < currentWeight.Date; date = date.AddDays(1))
                    {
                        weight += changePerDay;
                        missingDays.Add(new SourceMeasurement
                        {
                            Date = date,
                            Weight = Math.Round(weight, 3),
                            Timestamp = date.AddHours(23).AddMinutes(59).AddSeconds(59),
                            Source = "interpolated",
                            WeightIsInterpolated = true
                        });
                    }
                }
            }

            previous = currentWeight;
        }

        // Add in the missing days and re-sort
        return sortedMeasurements.Concat(missingDays)
            .OrderBy(m => m.Date)
            .ToList();
    }

    /// <summary>
    /// Interpolates missing fat measurements between existing measurements
    /// Port of interpolateFatMeasurements from TypeScript
    /// </summary>
    private static List<SourceMeasurement> InterpolateFatMeasurements(List<SourceMeasurement> fatMeasurements)
    {
        // Sort measurements by date first to ensure correct interpolation
        var sortedMeasurements = fatMeasurements.OrderBy(m => m.Date).ToList();
        var missingFatDays = new List<SourceMeasurement>();
        SourceMeasurement? previous = null;

        for (int i = 0; i < sortedMeasurements.Count; i++)
        {
            var currentFat = sortedMeasurements[i];

            if (previous != null && previous.FatRatio.HasValue && currentFat.FatRatio.HasValue)
            {
                var daysBetween = (currentFat.Date - previous.Date).Days;

                if (daysBetween > 1)
                {
                    var fatChangePerDay = (currentFat.FatRatio.Value - previous.FatRatio.Value) / daysBetween;
                    var weightChangePerDay = (currentFat.Weight - previous.Weight) / daysBetween;
                    var fatRatio = previous.FatRatio.Value;
                    var weight = previous.Weight;

                    for (var date = previous.Date.AddDays(1); date < currentFat.Date; date = date.AddDays(1))
                    {
                        fatRatio += fatChangePerDay;
                        weight += weightChangePerDay;
                        missingFatDays.Add(new SourceMeasurement
                        {
                            Date = date,
                            Source = "interpolated",
                            Weight = Math.Round(weight, 3),
                            WeightIsInterpolated = true,
                            Timestamp = date,
                            FatRatio = Math.Round(fatRatio, 4),
                            FatRatioIsInterpolated = true
                        });
                    }
                }
            }

            previous = currentFat;
        }

        return sortedMeasurements.Concat(missingFatDays)
            .OrderBy(m => m.Date)
            .ToList();
    }

    /// <summary>
    /// Trend smoothing factor matching TypeScript implementation
    /// </summary>
    private const decimal TREND_SMOOTHING_FACTOR = 0.1m;

    /// <summary>
    /// Computes weight trends from source measurements
    /// Port of computeWeightTrends from TypeScript
    /// </summary>
    private static List<ComputedMeasurement> ComputeWeightTrends(List<SourceMeasurement> sourceMeasurements)
    {
        decimal trendWeight = 0;
        var measurements = new List<ComputedMeasurement>();

        for (int i = 0; i < sourceMeasurements.Count; i++)
        {
            var sourceMeasurement = sourceMeasurements[i];
            var weight = sourceMeasurement.Weight;

            if (i == 0)
            {
                trendWeight = weight;
            }
            else
            {
                trendWeight = trendWeight + TREND_SMOOTHING_FACTOR * (weight - trendWeight);
            }

            measurements.Add(new ComputedMeasurement
            {
                Date = sourceMeasurement.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                ActualWeight = Math.Round(sourceMeasurement.Weight, 3),
                TrendWeight = Math.Round(trendWeight, 3),
                WeightIsInterpolated = sourceMeasurement.WeightIsInterpolated,
                FatIsInterpolated = false // Will be set correctly when processing fat data
            });
        }

        return measurements;
    }

    /// <summary>
    /// Computes fat trends and updates measurements with fat data
    /// Port of computeFatTrends from TypeScript
    /// </summary>
    private static List<ComputedMeasurement> ComputeFatTrends(List<SourceMeasurement> fatSourceMeasurements, List<ComputedMeasurement> measurements)
    {
        var measurementsByDate = measurements.ToDictionary(m => m.Date, m => m);
        var additionalMeasurements = new List<ComputedMeasurement>();

        decimal trendFatRatio = 0;

        for (int i = 0; i < fatSourceMeasurements.Count; i++)
        {
            var sourceMeasurement = fatSourceMeasurements[i];
            var fatRatio = sourceMeasurement.FatRatio!.Value;

            if (i == 0)
            {
                trendFatRatio = fatRatio;
            }
            else
            {
                trendFatRatio = trendFatRatio + TREND_SMOOTHING_FACTOR * (fatRatio - trendFatRatio);
            }

            var dateKey = sourceMeasurement.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

            if (measurementsByDate.TryGetValue(dateKey, out var existingMeasurement))
            {
                // Update existing measurement with fat data
                // Since ComputedMeasurement has init-only properties, we need to create a new one
                var updatedMeasurement = new ComputedMeasurement
                {
                    Date = existingMeasurement.Date,
                    ActualWeight = existingMeasurement.ActualWeight,
                    TrendWeight = existingMeasurement.TrendWeight,
                    WeightIsInterpolated = existingMeasurement.WeightIsInterpolated,
                    FatIsInterpolated = sourceMeasurement.FatRatioIsInterpolated,
                    ActualFatPercent = Math.Round(fatRatio, 4),
                    TrendFatPercent = Math.Round(trendFatRatio, 4)
                };

                measurementsByDate[dateKey] = updatedMeasurement;
            }
            else
            {
                // This is an interpolated fat day that doesn't have a corresponding weight measurement
                additionalMeasurements.Add(new ComputedMeasurement
                {
                    Date = sourceMeasurement.Date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    ActualWeight = Math.Round(sourceMeasurement.Weight, 3),
                    TrendWeight = Math.Round(sourceMeasurement.Weight, 3), // Use the interpolated weight as trend too
                    WeightIsInterpolated = true,
                    FatIsInterpolated = sourceMeasurement.FatRatioIsInterpolated,
                    ActualFatPercent = Math.Round(fatRatio, 4),
                    TrendFatPercent = Math.Round(trendFatRatio, 4)
                });
            }
        }

        // Combine original measurements with additional ones and re-sort
        return measurementsByDate.Values.Concat(additionalMeasurements)
            .OrderBy(m => m.Date)
            .ToList();
    }
}
