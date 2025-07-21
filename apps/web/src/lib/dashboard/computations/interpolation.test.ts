import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { interpolateWeightMeasurements, interpolateFatMeasurements } from "./interpolation";
import type { SourceMeasurement } from "../../core/interfaces";

describe("interpolation", () => {
  // Helper to create source measurements
  function createMeasurement(dateStr: string, weight: number, options: Partial<SourceMeasurement> = {}): SourceMeasurement {
    const date = LocalDate.parse(dateStr);
    return {
      date,
      timestamp: date.atTime(8, 0),
      source: "manual",
      weight,
      ...options,
    };
  }

  describe("interpolateWeightMeasurements", () => {
    it("should return empty array for empty input", () => {
      const result = interpolateWeightMeasurements([]);
      expect(result).toEqual([]);
    });

    it("should return single measurement unchanged", () => {
      const measurement = createMeasurement("2024-01-01", 80);
      const result = interpolateWeightMeasurements([measurement]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(measurement);
    });

    it("should not interpolate consecutive days", () => {
      const measurements = [createMeasurement("2024-01-01", 80), createMeasurement("2024-01-02", 81), createMeasurement("2024-01-03", 82)];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(3);
      expect(result.every((m) => m.source !== "interpolated")).toBe(true);
      expect(result[1].weightIsInterpolated).toBe(false);
      expect(result[2].weightIsInterpolated).toBe(false);
    });

    it("should interpolate single missing day", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-01-03", 82), // Gap on Jan 2
      ];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(3);

      // Check interpolated day
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      expect(jan2).toBeDefined();
      expect(jan2!.weight).toBe(81); // Linear interpolation
      expect(jan2!.source).toBe("interpolated");
      expect(jan2!.weightIsInterpolated).toBe(true);
      expect(jan2!.timestamp.toString()).toContain("23:59:59");
    });

    it("should interpolate multiple missing days", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-01-05", 84), // Gap of 3 days
      ];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(5);

      // Check each interpolated day
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");
      const jan4 = result.find((m) => m.date.toString() === "2024-01-04");

      expect(jan2!.weight).toBe(81); // 80 + 1
      expect(jan3!.weight).toBe(82); // 80 + 2
      expect(jan4!.weight).toBe(83); // 80 + 3

      // All should be marked as interpolated
      [jan2, jan3, jan4].forEach((day) => {
        expect(day!.source).toBe("interpolated");
        expect(day!.weightIsInterpolated).toBe(true);
      });
    });

    it("should handle decreasing weight interpolation", () => {
      const measurements = [
        createMeasurement("2024-01-01", 84),
        createMeasurement("2024-01-05", 80), // Lost 4kg over 4 days
      ];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(5);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");
      const jan4 = result.find((m) => m.date.toString() === "2024-01-04");

      expect(jan2!.weight).toBe(83); // 84 - 1
      expect(jan3!.weight).toBe(82); // 84 - 2
      expect(jan4!.weight).toBe(81); // 84 - 3
    });

    it("should handle multiple gaps correctly", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-01-03", 82), // Gap
        createMeasurement("2024-01-04", 83),
        createMeasurement("2024-01-07", 86), // Another gap
      ];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(7);

      // First gap
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      expect(jan2!.weight).toBe(81);

      // Second gap
      const jan5 = result.find((m) => m.date.toString() === "2024-01-05");
      const jan6 = result.find((m) => m.date.toString() === "2024-01-06");
      expect(jan5!.weight).toBe(84);
      expect(jan6!.weight).toBe(85);
    });

    it("should handle unsorted measurements correctly", () => {
      // Function should sort input data before processing
      const unsortedMeasurements = [createMeasurement("2024-01-03", 82), createMeasurement("2024-01-01", 80), createMeasurement("2024-01-05", 84)];

      const result = interpolateWeightMeasurements(unsortedMeasurements);

      expect(result).toHaveLength(5); // 3 original + 2 interpolated

      // Verify all dates are present and sorted
      const dates = result.map((m) => m.date.toString());
      expect(dates).toEqual([
        "2024-01-01",
        "2024-01-02", // interpolated
        "2024-01-03",
        "2024-01-04", // interpolated
        "2024-01-05",
      ]);

      // Verify interpolated values are correct
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan4 = result.find((m) => m.date.toString() === "2024-01-04");
      expect(jan2!.weight).toBe(81); // Between 80 and 82
      expect(jan4!.weight).toBe(83); // Between 82 and 84
    });

    it("should handle large gaps efficiently", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-02-01", 110), // 31 day gap, gained 30kg
      ];

      const result = interpolateWeightMeasurements(measurements);

      expect(result).toHaveLength(32); // 2 original + 30 interpolated

      // Check a few interpolated values
      const jan15 = result.find((m) => m.date.toString() === "2024-01-15");
      expect(jan15!.weight).toBeCloseTo(93.548, 2); // 80 + 14 * (30/31)

      const jan31 = result.find((m) => m.date.toString() === "2024-01-31");
      expect(jan31!.weight).toBeCloseTo(109.032, 2); // 80 + 30 * (30/31)
    });

    it("should preserve existing interpolation flags", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80, { weightIsInterpolated: true }),
        createMeasurement("2024-01-02", 81, { weightIsInterpolated: false }),
        createMeasurement("2024-01-04", 83, { weightIsInterpolated: false }),
      ];

      const result = interpolateWeightMeasurements(measurements);

      // Original flags should be preserved
      expect(result[0].weightIsInterpolated).toBe(true);
      expect(result[1].weightIsInterpolated).toBe(false);

      // New interpolated day
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");
      expect(jan3!.weightIsInterpolated).toBe(true);
    });

    it("should handle fractional weight changes", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        createMeasurement("2024-01-04", 81), // 1kg over 3 days
      ];

      const result = interpolateWeightMeasurements(measurements);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");

      expect(jan2!.weight).toBeCloseTo(80.333, 3);
      expect(jan3!.weight).toBeCloseTo(80.667, 3);
    });

    it("should handle completely reverse-ordered measurements", () => {
      const reverseOrderedMeasurements = [
        createMeasurement("2024-01-05", 85),
        createMeasurement("2024-01-04", 84),
        createMeasurement("2024-01-03", 83),
        createMeasurement("2024-01-02", 82),
        createMeasurement("2024-01-01", 81),
      ];

      const result = interpolateWeightMeasurements(reverseOrderedMeasurements);

      // Should be sorted with no interpolation needed (consecutive days)
      expect(result).toHaveLength(5);
      const weights = result.map((m) => m.weight);
      expect(weights).toEqual([81, 82, 83, 84, 85]);

      // None should be interpolated since they're consecutive
      expect(result.every((m) => m.source !== "interpolated")).toBe(true);
    });
  });

  describe("interpolateFatMeasurements", () => {
    it("should return empty array for empty input", () => {
      const result = interpolateFatMeasurements([]);
      expect(result).toEqual([]);
    });

    it("should interpolate missing fat measurements", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-03", 82, { fatRatio: 0.23 }), // Lost 2% fat
      ];

      const result = interpolateFatMeasurements(measurements);

      expect(result).toHaveLength(3);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      expect(jan2).toBeDefined();
      expect(jan2!.weight).toBe(81);
      expect(jan2!.fatRatio).toBe(0.24); // Linear interpolation
      expect(jan2!.source).toBe("interpolated");
      expect(jan2!.weightIsInterpolated).toBe(true);
      expect(jan2!.fatRatioIsInterpolated).toBe(true);
      expect(jan2!.timestamp.toString()).toContain("T00:00");
    });

    it("should handle multiple missing days with fat", () => {
      const measurements = [
        createMeasurement("2024-01-01", 100, { fatRatio: 0.3 }),
        createMeasurement("2024-01-05", 96, { fatRatio: 0.26 }), // Lost 4kg and 4% fat
      ];

      const result = interpolateFatMeasurements(measurements);

      expect(result).toHaveLength(5);

      // Check interpolated days
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");
      const jan4 = result.find((m) => m.date.toString() === "2024-01-04");

      // Weight interpolation
      expect(jan2!.weight).toBe(99);
      expect(jan3!.weight).toBe(98);
      expect(jan4!.weight).toBe(97);

      // Fat ratio interpolation
      expect(jan2!.fatRatio).toBeCloseTo(0.29, 5);
      expect(jan3!.fatRatio).toBeCloseTo(0.28, 5);
      expect(jan4!.fatRatio).toBeCloseTo(0.27, 5);
    });

    it("should handle increasing fat ratio", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80, { fatRatio: 0.2 }),
        createMeasurement("2024-01-04", 83, { fatRatio: 0.23 }), // Gained weight and fat
      ];

      const result = interpolateFatMeasurements(measurements);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");

      expect(jan2!.fatRatio).toBeCloseTo(0.21, 5);
      expect(jan3!.fatRatio).toBeCloseTo(0.22, 5);
    });

    it("should handle missing fatRatio gracefully", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80), // No fatRatio
        createMeasurement("2024-01-03", 82, { fatRatio: 0.25 }),
      ];

      // This should handle the missing fatRatio without crashing
      expect(() => interpolateFatMeasurements(measurements)).not.toThrow();
    });

    it("should handle unsorted measurements correctly", () => {
      // Function should sort input data before processing
      const unsortedMeasurements = [
        createMeasurement("2024-01-03", 82, { fatRatio: 0.26 }),
        createMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-05", 84, { fatRatio: 0.27 }),
      ];

      const result = interpolateFatMeasurements(unsortedMeasurements);

      expect(result).toHaveLength(5); // 3 original + 2 interpolated

      // Verify all dates are present and sorted
      const dates = result.map((m) => m.date.toString());
      expect(dates).toEqual([
        "2024-01-01",
        "2024-01-02", // interpolated
        "2024-01-03",
        "2024-01-04", // interpolated
        "2024-01-05",
      ]);

      // Verify interpolated values are correct
      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan4 = result.find((m) => m.date.toString() === "2024-01-04");
      expect(jan2!.weight).toBe(81); // Between 80 and 82
      expect(jan2!.fatRatio).toBe(0.255); // Between 0.25 and 0.26
      expect(jan4!.weight).toBe(83); // Between 82 and 84
      expect(jan4!.fatRatio).toBe(0.265); // Between 0.26 and 0.27
    });

    it("should handle fractional changes in fat ratio", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-04", 81, { fatRatio: 0.253 }), // 0.3% increase over 3 days
      ];

      const result = interpolateFatMeasurements(measurements);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");
      const jan3 = result.find((m) => m.date.toString() === "2024-01-03");

      expect(jan2!.fatRatio).toBeCloseTo(0.251, 3);
      expect(jan3!.fatRatio).toBeCloseTo(0.252, 3);
    });

    it("should handle multiple gaps with fat measurements", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-03", 82, { fatRatio: 0.24 }),
        createMeasurement("2024-01-06", 85, { fatRatio: 0.23 }),
      ];

      const result = interpolateFatMeasurements(measurements);

      expect(result).toHaveLength(6);

      // Verify all days are present
      const dates = result.map((m) => m.date.toString()).sort();
      expect(dates).toEqual(["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05", "2024-01-06"]);
    });

    it("should set correct timestamps for interpolated fat measurements", () => {
      const measurements = [createMeasurement("2024-01-01", 80, { fatRatio: 0.25 }), createMeasurement("2024-01-03", 82, { fatRatio: 0.23 })];

      const result = interpolateFatMeasurements(measurements);

      const jan2 = result.find((m) => m.date.toString() === "2024-01-02");

      // Fat interpolation uses start of day timestamp
      expect(jan2!.timestamp.toString()).toContain("2024-01-02T00:00");
    });

    it("should handle completely reverse-ordered fat measurements", () => {
      const reverseOrderedMeasurements = [
        createMeasurement("2024-01-05", 85, { fatRatio: 0.25 }),
        createMeasurement("2024-01-04", 84, { fatRatio: 0.24 }),
        createMeasurement("2024-01-03", 83, { fatRatio: 0.23 }),
        createMeasurement("2024-01-02", 82, { fatRatio: 0.22 }),
        createMeasurement("2024-01-01", 81, { fatRatio: 0.21 }),
      ];

      const result = interpolateFatMeasurements(reverseOrderedMeasurements);

      // Should be sorted with no interpolation needed (consecutive days)
      expect(result).toHaveLength(5);
      const weights = result.map((m) => m.weight);
      const fatRatios = result.map((m) => m.fatRatio);
      expect(weights).toEqual([81, 82, 83, 84, 85]);
      expect(fatRatios).toEqual([0.21, 0.22, 0.23, 0.24, 0.25]);

      // None should be interpolated since they're consecutive
      expect(result.every((m) => m.source !== "interpolated")).toBe(true);
    });
  });
});
