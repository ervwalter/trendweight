import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LocalDate } from "@js-joda/core";
import { computeDeltas, computeWeightSlope, computeActiveSlope } from "./stats";
import type { DataPoint, Measurement } from "@/lib/core/interfaces";

describe("stats", () => {
  // Mock current date for consistent testing
  const MOCK_TODAY = LocalDate.parse("2024-01-15");

  beforeEach(() => {
    vi.spyOn(LocalDate, "now").mockReturnValue(MOCK_TODAY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to create data points
  function createDataPoint(dateStr: string, trend: number, actual = trend): DataPoint {
    return {
      date: LocalDate.parse(dateStr),
      source: "manual",
      actual,
      trend,
      isInterpolated: false,
    };
  }

  // Helper to create measurements
  function createMeasurement(dateStr: string, trendWeight: number): Measurement {
    const date = LocalDate.parse(dateStr);
    return {
      date,
      source: "manual",
      actualWeight: trendWeight,
      trendWeight,
      weightIsInterpolated: false,
      fatIsInterpolated: false,
    };
  }

  describe("computeDeltas", () => {
    it("should return empty array for empty data points", () => {
      const result = computeDeltas("weight", []);
      expect(result).toEqual([]);
    });

    it("should return empty array for single data point", () => {
      const dataPoints = [createDataPoint("2024-01-15", 80)];
      const result = computeDeltas("weight", dataPoints);
      expect(result).toEqual([]);
    });

    it("should return empty array if most recent reading is too old", () => {
      const dataPoints = [
        createDataPoint("2024-01-10", 80), // 5 days ago
        createDataPoint("2024-01-11", 81),
      ];
      const result = computeDeltas("weight", dataPoints);
      expect(result).toEqual([]);
    });

    it("should calculate yesterday delta when data is available", () => {
      const dataPoints = [
        createDataPoint("2024-01-13", 79.5),
        createDataPoint("2024-01-14", 80),
        createDataPoint("2024-01-15", 80.5), // Today
      ];

      const result = computeDeltas("weight", dataPoints);

      expect(result).toContainEqual({
        period: 1,
        description: "yesterday",
        delta: 0.5, // 80.5 - 80
      });
    });

    it("should calculate week delta when enough data points exist", () => {
      const dataPoints = [
        createDataPoint("2024-01-08", 79), // 7 days ago
        createDataPoint("2024-01-10", 79.2),
        createDataPoint("2024-01-12", 79.5),
        createDataPoint("2024-01-13", 79.7),
        createDataPoint("2024-01-14", 79.9),
        createDataPoint("2024-01-15", 80), // Today
      ];

      const result = computeDeltas("weight", dataPoints);

      expect(result).toContainEqual({
        period: 7,
        description: "last week",
        delta: 1, // 80 - 79
      });
    });

    it("should not include week delta with insufficient data points", () => {
      const dataPoints = [
        createDataPoint("2024-01-08", 79), // 7 days ago
        createDataPoint("2024-01-14", 79.9),
        createDataPoint("2024-01-15", 80), // Today (only 3 points total)
      ];

      const result = computeDeltas("weight", dataPoints);

      expect(result).not.toContainEqual(expect.objectContaining({ period: 7 }));
    });

    it("should calculate two weeks delta when enough data points exist", () => {
      const dataPoints = Array.from({ length: 15 }, (_, i) => {
        const date = MOCK_TODAY.minusDays(14 - i);
        const weight = 78 + i * 0.1; // Gradual increase
        return createDataPoint(date.toString(), weight);
      });

      const result = computeDeltas("weight", dataPoints);

      expect(result).toContainEqual({
        period: 14,
        description: "two weeks ago",
        delta: expect.closeTo(1.4, 5), // ~79.4 - 78
      });
    });

    it("should calculate month delta when enough data points exist", () => {
      const dataPoints = Array.from({ length: 29 }, (_, i) => {
        const date = MOCK_TODAY.minusDays(28 - i);
        const weight = 75 + i * 0.1; // Gradual increase
        return createDataPoint(date.toString(), weight);
      });

      const result = computeDeltas("weight", dataPoints);

      expect(result).toContainEqual({
        period: 28,
        description: "a month ago",
        delta: expect.closeTo(2.8, 5), // ~77.8 - 75
      });
    });

    it("should handle negative deltas correctly", () => {
      const dataPoints = [
        createDataPoint("2024-01-14", 81),
        createDataPoint("2024-01-15", 80), // Lost weight
      ];

      const result = computeDeltas("weight", dataPoints);

      expect(result).toContainEqual({
        period: 1,
        description: "yesterday",
        delta: -1, // 80 - 81
      });
    });

    it("should handle data with gaps correctly", () => {
      const dataPoints = [
        createDataPoint("2024-01-01", 75),
        createDataPoint("2024-01-05", 76), // Gap
        createDataPoint("2024-01-08", 77), // Exactly 7 days ago
        createDataPoint("2024-01-14", 79),
        createDataPoint("2024-01-15", 80),
      ];

      const result = computeDeltas("weight", dataPoints);

      // Should not include week delta due to insufficient points between
      expect(result).not.toContainEqual(expect.objectContaining({ period: 7 }));
    });

    it("should handle weight mode with proper rounding", () => {
      // Test that weight values round to 1 decimal place to match UI
      // 160.16 rounds to 160.2, 160.13 rounds to 160.1
      const dataPoints = [createDataPoint("2024-01-14", 160.16), createDataPoint("2024-01-15", 160.13)];

      const result = computeDeltas("weight", dataPoints);

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe(1);
      expect(result[0].description).toBe("yesterday");
      expect(result[0].delta).toBeCloseTo(-0.1, 10); // -0.1, not -0.03
    });

    it("should handle fatpercent mode with proper precision", () => {
      // Test with realistic body fat percentages that need higher precision
      const dataPoints = [
        createDataPoint("2024-01-14", 0.4066), // 40.66% → rounds to 0.407
        createDataPoint("2024-01-15", 0.4058), // 40.58% → rounds to 0.406
      ];

      const result = computeDeltas("fatpercent", dataPoints);

      expect(result).toHaveLength(1);
      expect(result[0].period).toBe(1);
      expect(result[0].description).toBe("yesterday");
      expect(result[0].delta).toBeCloseTo(-0.001, 3); // 0.406 - 0.407 = -0.001
    });

    it("should handle mass modes with weight-style rounding", () => {
      // Fat mass and lean mass should use same rounding as weight
      const dataPoints = [
        createDataPoint("2024-01-14", 25.16), // kg or lbs
        createDataPoint("2024-01-15", 25.13),
      ];

      const fatMassResult = computeDeltas("fatmass", dataPoints);
      const leanMassResult = computeDeltas("leanmass", dataPoints);

      [fatMassResult, leanMassResult].forEach((result) => {
        expect(result).toHaveLength(1);
        expect(result[0].period).toBe(1);
        expect(result[0].description).toBe("yesterday");
        expect(result[0].delta).toBeCloseTo(-0.1, 10); // Same as weight rounding
      });
    });

    it("should not round small fat percentage changes to zero (regression test)", () => {
      // This test would have caught the original bug where fat % deltas showed 0.0%
      // Using realistic body fat data that would have been rounded away
      const dataPoints = [
        createDataPoint("2024-01-08", 0.41), // 41.00% (7 days ago)
        createDataPoint("2024-01-10", 0.409), // 40.90%
        createDataPoint("2024-01-12", 0.408), // 40.80%
        createDataPoint("2024-01-13", 0.407), // 40.70%
        createDataPoint("2024-01-14", 0.4065), // 40.65% (yesterday)
        createDataPoint("2024-01-15", 0.4055), // 40.55% (today)
      ];

      const result = computeDeltas("fatpercent", dataPoints);

      // Week delta: 0.4055→0.406, 0.4100→0.410, delta = -0.004
      const weekDelta = result.find((d) => d.period === 7);
      expect(weekDelta).toBeDefined();
      expect(weekDelta!.delta).toBeCloseTo(-0.004, 3);
      expect(weekDelta!.delta).not.toBe(0);

      // Yesterday delta: 0.4055→0.406, 0.4065→0.407, delta = -0.001
      const yesterdayDelta = result.find((d) => d.period === 1);
      expect(yesterdayDelta).toBeDefined();
      expect(yesterdayDelta!.delta).toBeCloseTo(-0.001, 3);
      expect(yesterdayDelta!.delta).not.toBe(0);
    });

    it("should handle rounding edge cases for weight", () => {
      // Test values that round to same number should produce zero delta
      const dataPoints1 = [
        createDataPoint("2024-01-14", 160.14), // rounds to 160.1
        createDataPoint("2024-01-15", 160.06), // rounds to 160.1
      ];
      const result1 = computeDeltas("weight", dataPoints1);
      expect(result1[0].delta).toBe(0); // Should be 0, not -0.08

      // Test values that round differently
      const dataPoints2 = [
        createDataPoint("2024-01-14", 160.15), // rounds to 160.2
        createDataPoint("2024-01-15", 160.14), // rounds to 160.1
      ];
      const result2 = computeDeltas("weight", dataPoints2);
      expect(result2[0].delta).toBeCloseTo(-0.1, 10); // Should be -0.1, not -0.01
    });

    it("should handle rounding edge cases for fat percentage", () => {
      // Test fat percentages that are close but round differently
      const dataPoints1 = [
        createDataPoint("2024-01-14", 0.4005), // rounds to 0.401
        createDataPoint("2024-01-15", 0.4004), // rounds to 0.400
      ];
      const result1 = computeDeltas("fatpercent", dataPoints1);
      expect(result1[0].delta).toBeCloseTo(-0.001, 3); // Preserves meaningful changes

      // Test fat percentages that round to the same value
      const dataPoints2 = [
        createDataPoint("2024-01-14", 0.40024), // rounds to 0.400
        createDataPoint("2024-01-15", 0.40025), // rounds to 0.400
      ];
      const result2 = computeDeltas("fatpercent", dataPoints2);
      expect(result2[0].delta).toBe(0); // Rounds to zero as expected
    });

    it("should calculate all time period deltas correctly for fat percentage", () => {
      // Create 29 days of fat percentage data with larger changes to show meaningful deltas
      const dataPoints = Array.from({ length: 29 }, (_, i) => {
        const date = MOCK_TODAY.minusDays(28 - i);
        // Start at 42.0% and decrease to 40.0% over 28 days (2% total change)
        const fatPercent = 0.42 - i * 0.0007; // Decrease by 0.07% per day
        return createDataPoint(date.toString(), fatPercent);
      });

      const result = computeDeltas("fatpercent", dataPoints);

      // Verify each delta shows meaningful changes after rounding
      const yesterdayDelta = result.find((d) => d.period === 1);
      expect(yesterdayDelta).toBeDefined();
      expect(yesterdayDelta!.delta).toBeCloseTo(-0.001, 3); // Daily change preserved

      const weekDelta = result.find((d) => d.period === 7);
      expect(weekDelta).toBeDefined();
      expect(weekDelta!.delta).toBeCloseTo(-0.005, 3); // Weekly change preserved

      const twoWeekDelta = result.find((d) => d.period === 14);
      expect(twoWeekDelta).toBeDefined();
      expect(twoWeekDelta!.delta).toBeCloseTo(-0.01, 3); // Two-week change preserved

      const monthDelta = result.find((d) => d.period === 28);
      expect(monthDelta).toBeDefined();
      expect(monthDelta!.delta).toBeCloseTo(-0.02, 3); // Monthly change preserved

      // None of these should be zero - they represent meaningful fat % changes
      expect(Math.abs(yesterdayDelta!.delta)).toBeGreaterThan(0);
      expect(Math.abs(weekDelta!.delta)).toBeGreaterThan(0);
      expect(Math.abs(twoWeekDelta!.delta)).toBeGreaterThan(0);
      expect(Math.abs(monthDelta!.delta)).toBeGreaterThan(0);
    });

    it("should document the rounding behavior rationale", () => {
      // This test documents why different modes need different rounding precision

      // WEIGHT MODE: Round to 1 decimal place (0.1 unit precision)
      // Rationale: Weight changes smaller than 0.1 lbs/kg are not meaningful to users
      // due to natural fluctuations, scale precision, and display formatting
      const weightData = [createDataPoint("2024-01-14", 160.16), createDataPoint("2024-01-15", 160.13)];
      const weightResult = computeDeltas("weight", weightData);
      expect(weightResult[0].delta).toBeCloseTo(-0.1, 10); // Rounded from -0.03 to match UI

      // FATPERCENT MODE: Round to 3 decimal places (0.001 precision = 0.1 percentage points)
      // Rationale: Body fat percentage changes of 0.1% ARE meaningful to users
      // Small changes accumulate over time and users track gradual progress
      const fatData = [createDataPoint("2024-01-14", 0.4066), createDataPoint("2024-01-15", 0.4058)];
      const fatResult = computeDeltas("fatpercent", fatData);
      expect(fatResult[0].delta).toBeCloseTo(-0.001, 3); // 0.407 - 0.406 = -0.001

      // MASS MODES: Use weight-style rounding
      // Rationale: Fat/lean mass are derived from weight, so same precision applies
      const massData = [createDataPoint("2024-01-14", 25.16), createDataPoint("2024-01-15", 25.13)];
      const fatMassResult = computeDeltas("fatmass", massData);
      const leanMassResult = computeDeltas("leanmass", massData);
      expect(fatMassResult[0].delta).toBeCloseTo(-0.1, 10); // Same as weight
      expect(leanMassResult[0].delta).toBeCloseTo(-0.1, 10); // Same as weight

      // This rounding ensures delta calculations match what users see in the UI
      // while preserving meaningful changes that would otherwise be lost
    });
  });

  describe("computeWeightSlope", () => {
    it("should return 0 for empty measurements", () => {
      const result = computeWeightSlope([]);
      expect(result).toBe(0);
    });

    it("should return 0 for single measurement", () => {
      const measurements = [createMeasurement("2024-01-15", 80)];
      const result = computeWeightSlope(measurements);
      expect(result).toBe(0);
    });

    it("should calculate positive slope for increasing weight", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = 80 + i * 0.1; // Gain 0.1kg per day
        return createMeasurement(date.toString(), weight);
      });

      const slope = computeWeightSlope(measurements);
      expect(slope).toBeCloseTo(0.1, 5);
    });

    it("should calculate negative slope for decreasing weight", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = 80 - i * 0.1; // Lose 0.1kg per day
        return createMeasurement(date.toString(), weight);
      });

      const slope = computeWeightSlope(measurements);
      expect(slope).toBeCloseTo(-0.1, 5);
    });

    it("should use only last 14 measurements", () => {
      const measurements = Array.from({ length: 30 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = i < 16 ? 80 : 80 + (i - 16) * 0.1; // Flat then increase
        return createMeasurement(date.toString(), weight);
      });

      const slope = computeWeightSlope(measurements);
      expect(slope).toBeCloseTo(0.1, 5); // Should only see the increasing portion
    });

    it("should handle measurements with null trend weights", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        { ...createMeasurement("2024-01-02", 0), trendWeight: null as unknown as number },
        createMeasurement("2024-01-03", 81),
        createMeasurement("2024-01-04", 81.5),
      ];

      const slope = computeWeightSlope(measurements);
      expect(slope).toBeGreaterThan(0); // Should still calculate with valid points
    });

    it("should return 0 for flat trend", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        return createMeasurement(date.toString(), 80); // Constant weight
      });

      const slope = computeWeightSlope(measurements);
      expect(slope).toBeCloseTo(0, 5);
    });

    it("should handle non-linear trends correctly", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = 80 + Math.sin(i) * 2; // Sinusoidal pattern
        return createMeasurement(date.toString(), weight);
      });

      const slope = computeWeightSlope(measurements);
      expect(typeof slope).toBe("number");
      expect(Math.abs(slope)).toBeLessThan(1); // Should be relatively small
    });
  });

  describe("computeActiveSlope", () => {
    it("should return 0 for empty data points", () => {
      const result = computeActiveSlope("weight", []);
      expect(result).toBe(0);
    });

    it("should return 0 for single data point", () => {
      const dataPoints = [createDataPoint("2024-01-15", 80)];
      const result = computeActiveSlope("weight", dataPoints);
      expect(result).toBe(0);
    });

    it("should use 14 points for weight mode", () => {
      const dataPoints = Array.from({ length: 20 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = i < 6 ? 85 : 80 + i * 0.1; // Different pattern before/after
        return createDataPoint(date.toString(), weight);
      });

      const slope = computeActiveSlope("weight", dataPoints);
      expect(slope).toBeCloseTo(0.1, 5); // Should only see last 14 points
    });

    it("should use 28 points for fat/lean modes", () => {
      const dataPoints = Array.from({ length: 35 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const value = i < 7 ? 0.3 : 0.25 - i * 0.001; // Different pattern
        return createDataPoint(date.toString(), value);
      });

      const slope = computeActiveSlope("fatpercent", dataPoints);
      expect(slope).toBeLessThan(0); // Should see decreasing trend
    });

    it("should handle different modes correctly", () => {
      const dataPoints = Array.from({ length: 30 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const value = 20 + i * 0.1;
        return createDataPoint(date.toString(), value);
      });

      // Weight mode uses 14 points
      const weightSlope = computeActiveSlope("weight", dataPoints);

      // Fat mass mode uses 28 points
      const fatMassSlope = computeActiveSlope("fatmass", dataPoints);

      // Both should be positive but potentially different values
      expect(weightSlope).toBeGreaterThan(0);
      expect(fatMassSlope).toBeGreaterThan(0);
    });

    it("should calculate slope using trend values not actual", () => {
      const dataPoints = Array.from({ length: 14 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const actual = 80 + (Math.random() - 0.5) * 5; // Noisy actual values
        const trend = 80 + i * 0.1; // Smooth trend
        return createDataPoint(date.toString(), trend, actual);
      });

      const slope = computeActiveSlope("weight", dataPoints);
      expect(slope).toBeCloseTo(0.1, 5); // Should follow trend not actual
    });

    it("should handle insufficient data gracefully", () => {
      const dataPoints = [createDataPoint("2024-01-14", 80), createDataPoint("2024-01-15", 81)];

      const weightSlope = computeActiveSlope("weight", dataPoints);
      const fatSlope = computeActiveSlope("fatmass", dataPoints);

      // Should still calculate with available points
      expect(weightSlope).toBeCloseTo(1, 5);
      expect(fatSlope).toBeCloseTo(1, 5);
    });
  });

  describe("slope calculation edge cases", () => {
    it("should handle vertical line (same x values)", () => {
      // This shouldn't happen in practice but test the math
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-01-01", 81), // Same date
      ];

      const slope = computeWeightSlope(measurements);
      expect(isFinite(slope)).toBe(true);
    });

    it("should handle very large datasets efficiently", () => {
      const measurements = Array.from({ length: 1000 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        return createMeasurement(date.toString(), 80 + i * 0.01);
      });

      const startTime = performance.now();
      const slope = computeWeightSlope(measurements);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(10); // Should be fast
      expect(slope).toBeCloseTo(0.01, 5);
    });
  });
});
