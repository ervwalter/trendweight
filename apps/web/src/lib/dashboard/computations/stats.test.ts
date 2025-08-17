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

    it("should work with all modes", () => {
      const dataPoints = [createDataPoint("2024-01-14", 0.25), createDataPoint("2024-01-15", 0.24)];

      // Test different modes
      const weightResult = computeDeltas("weight", dataPoints);
      const fatPercentResult = computeDeltas("fatpercent", dataPoints);
      const fatMassResult = computeDeltas("fatmass", dataPoints);
      const leanMassResult = computeDeltas("leanmass", dataPoints);

      // All should calculate the same delta structure
      [weightResult, fatPercentResult, fatMassResult, leanMassResult].forEach((result) => {
        expect(result).toHaveLength(1);
        expect(result[0].period).toBe(1);
        expect(result[0].description).toBe("yesterday");
        expect(result[0].delta).toBeCloseTo(-0.1, 5);
      });
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
