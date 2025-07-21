import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { computeWeightTrends, computeFatTrends } from "./trend-calculations";
import type { SourceMeasurement } from "../../core/interfaces";

describe("trend-calculations", () => {
  // Helper to create source measurements
  function createSourceMeasurement(dateStr: string, weight: number, options: Partial<SourceMeasurement> = {}): SourceMeasurement {
    const date = LocalDate.parse(dateStr);
    return {
      date,
      timestamp: date.atTime(8, 0),
      source: "manual",
      weight,
      weightIsInterpolated: false,
      ...options,
    };
  }

  describe("computeWeightTrends", () => {
    it("should handle empty measurements array", () => {
      const result = computeWeightTrends([]);
      expect(result).toEqual([]);
    });

    it("should handle single measurement", () => {
      const measurement = createSourceMeasurement("2024-01-01", 80);
      const result = computeWeightTrends([measurement]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: measurement.date,
        source: "manual",
        actualWeight: 80,
        trendWeight: 80, // First measurement: trend = actual
        weightIsInterpolated: false,
        fatIsInterpolated: false,
      });
    });

    it("should calculate exponential moving average for trend", () => {
      const measurements = [createSourceMeasurement("2024-01-01", 80), createSourceMeasurement("2024-01-02", 81), createSourceMeasurement("2024-01-03", 82)];

      const result = computeWeightTrends(measurements);

      expect(result).toHaveLength(3);

      // First measurement: trend = actual
      expect(result[0].trendWeight).toBe(80);

      // Second measurement: trend = 80 + 0.1 * (81 - 80) = 80.1
      expect(result[1].trendWeight).toBeCloseTo(80.1, 5);

      // Third measurement: trend = 80.1 + 0.1 * (82 - 80.1) = 80.29
      expect(result[2].trendWeight).toBeCloseTo(80.29, 5);
    });

    it("should preserve interpolation flags", () => {
      const measurements = [
        createSourceMeasurement("2024-01-01", 80, { weightIsInterpolated: false }),
        createSourceMeasurement("2024-01-02", 81, { weightIsInterpolated: true }),
        createSourceMeasurement("2024-01-03", 82, { weightIsInterpolated: false }),
      ];

      const result = computeWeightTrends(measurements);

      expect(result[0].weightIsInterpolated).toBe(false);
      expect(result[1].weightIsInterpolated).toBe(true);
      expect(result[2].weightIsInterpolated).toBe(false);
    });

    it("should handle weight fluctuations correctly", () => {
      const measurements = [
        createSourceMeasurement("2024-01-01", 80),
        createSourceMeasurement("2024-01-02", 85), // +5kg spike
        createSourceMeasurement("2024-01-03", 80), // back to normal
      ];

      const result = computeWeightTrends(measurements);

      // Trend should smooth out the spike
      expect(result[0].trendWeight).toBe(80);
      expect(result[1].trendWeight).toBeCloseTo(80.5, 5); // 80 + 0.1 * 5
      expect(result[2].trendWeight).toBeCloseTo(80.45, 5); // 80.5 + 0.1 * (80 - 80.5)
    });

    it("should maintain source information", () => {
      const measurements = [
        createSourceMeasurement("2024-01-01", 80, { source: "withings" }),
        createSourceMeasurement("2024-01-02", 81, { source: "fitbit" }),
        createSourceMeasurement("2024-01-03", 82, { source: "manual" }),
      ];

      const result = computeWeightTrends(measurements);

      expect(result[0].source).toBe("withings");
      expect(result[1].source).toBe("fitbit");
      expect(result[2].source).toBe("manual");
    });

    it("should handle large datasets efficiently", () => {
      // Create 365 days of measurements
      const measurements = Array.from({ length: 365 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const weight = 80 + Math.sin(i / 30) * 2; // Sinusoidal weight pattern
        return createSourceMeasurement(date.toString(), weight);
      });

      const result = computeWeightTrends(measurements);

      expect(result).toHaveLength(365);

      // Verify trend is smoother than actual values
      const actualVariance = calculateVariance(measurements.map((m) => m.weight));
      const trendVariance = calculateVariance(result.map((m) => m.trendWeight));

      expect(trendVariance).toBeLessThan(actualVariance);
    });
  });

  describe("computeFatTrends", () => {
    it("should handle empty fat measurements", () => {
      const weightMeasurements = computeWeightTrends([createSourceMeasurement("2024-01-01", 80), createSourceMeasurement("2024-01-02", 81)]);

      const result = computeFatTrends([], weightMeasurements);

      expect(result).toEqual(weightMeasurements); // No changes
    });

    it("should update existing measurements with fat data", () => {
      const weightMeasurements = computeWeightTrends([createSourceMeasurement("2024-01-01", 80), createSourceMeasurement("2024-01-02", 81)]);

      const fatMeasurements = [
        createSourceMeasurement("2024-01-01", 80, { fatRatio: 0.25 }), // 25% fat
        createSourceMeasurement("2024-01-02", 81, { fatRatio: 0.24 }), // 24% fat
      ];

      const result = computeFatTrends(fatMeasurements, weightMeasurements);

      expect(result).toHaveLength(2);

      // First measurement
      expect(result[0].actualFatPercent).toBe(0.25);
      expect(result[0].actualFatMass).toBe(20); // 80 * 0.25
      expect(result[0].actualLeanMass).toBe(60); // 80 - 20
      expect(result[0].trendFatPercent).toBe(0.25); // First measurement

      // Second measurement with trending
      expect(result[1].actualFatPercent).toBe(0.24);
      expect(result[1].actualFatMass).toBeCloseTo(19.44, 5); // 81 * 0.24
      expect(result[1].actualLeanMass).toBeCloseTo(61.56, 5); // 81 - 19.44
      expect(result[1].trendFatPercent).toBeCloseTo(0.249, 5); // 0.25 + 0.1 * (0.24 - 0.25)
    });

    it("should create additional measurements for fat-only days", () => {
      const weightMeasurements = computeWeightTrends([
        createSourceMeasurement("2024-01-01", 80),
        createSourceMeasurement("2024-01-03", 82), // Gap on Jan 2
      ]);

      const fatMeasurements = [
        createSourceMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createSourceMeasurement("2024-01-02", 81, { fatRatio: 0.24, weight: 81, weightIsInterpolated: true }), // Interpolated day
        createSourceMeasurement("2024-01-03", 82, { fatRatio: 0.23 }),
      ];

      const result = computeFatTrends(fatMeasurements, weightMeasurements);

      expect(result).toHaveLength(3); // Should add the missing day

      // Check the interpolated day was added
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      expect(jan2).toBeDefined();
      expect(jan2!.weightIsInterpolated).toBe(true);
      expect(jan2!.actualWeight).toBe(81);
      expect(jan2!.trendWeight).toBe(81); // Uses interpolated weight as trend
      expect(jan2!.actualFatPercent).toBe(0.24);
    });

    it("should preserve fat interpolation flags", () => {
      const weightMeasurements = computeWeightTrends([createSourceMeasurement("2024-01-01", 80), createSourceMeasurement("2024-01-02", 81)]);

      const fatMeasurements = [
        createSourceMeasurement("2024-01-01", 80, { fatRatio: 0.25, fatRatioIsInterpolated: false }),
        createSourceMeasurement("2024-01-02", 81, { fatRatio: 0.24, fatRatioIsInterpolated: true }),
      ];

      const result = computeFatTrends(fatMeasurements, weightMeasurements);

      expect(result[0].fatIsInterpolated).toBe(false);
      expect(result[1].fatIsInterpolated).toBe(true);
    });

    it("should sort measurements by date after adding interpolated days", () => {
      const weightMeasurements = computeWeightTrends([createSourceMeasurement("2024-01-01", 80), createSourceMeasurement("2024-01-05", 84)]);

      const fatMeasurements = [
        createSourceMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createSourceMeasurement("2024-01-03", 82, { fatRatio: 0.24, weightIsInterpolated: true }),
        createSourceMeasurement("2024-01-02", 81, { fatRatio: 0.245, weightIsInterpolated: true }),
        createSourceMeasurement("2024-01-05", 84, { fatRatio: 0.23 }),
      ];

      const result = computeFatTrends(fatMeasurements, weightMeasurements);

      expect(result).toHaveLength(4);

      // Verify sorted order
      const dates = result.map((m) => m.date.toString());
      expect(dates).toEqual(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-05"]);
    });

    it("should calculate fat mass trends correctly", () => {
      const weightMeasurements = computeWeightTrends([
        createSourceMeasurement("2024-01-01", 100),
        createSourceMeasurement("2024-01-02", 100),
        createSourceMeasurement("2024-01-03", 100),
      ]);

      const fatMeasurements = [
        createSourceMeasurement("2024-01-01", 100, { fatRatio: 0.3 }), // 30kg fat
        createSourceMeasurement("2024-01-02", 100, { fatRatio: 0.25 }), // 25kg fat
        createSourceMeasurement("2024-01-03", 100, { fatRatio: 0.2 }), // 20kg fat
      ];

      const result = computeFatTrends(fatMeasurements, weightMeasurements);

      // Fat mass trending
      expect(result[0].trendFatMass).toBe(30);
      expect(result[1].trendFatMass).toBeCloseTo(29.5, 5); // 30 + 0.1 * (25 - 30)
      expect(result[2].trendFatMass).toBeCloseTo(28.55, 5); // 29.5 + 0.1 * (20 - 29.5)

      // Lean mass trending
      expect(result[0].trendLeanMass).toBe(70);
      expect(result[1].trendLeanMass).toBeCloseTo(70.5, 5); // 70 + 0.1 * (75 - 70)
      expect(result[2].trendLeanMass).toBeCloseTo(71.45, 5); // 70.5 + 0.1 * (80 - 70.5)
    });
  });
});

// Helper function to calculate variance
function calculateVariance(values: number[]): number {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}
