import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { convertMeasurements } from "./conversion";
import type { ProfileData } from "@/lib/core/interfaces";
import type { ApiComputedMeasurement } from "@/lib/api/types";

describe("conversion", () => {
  // Default profile for testing
  const defaultProfile: ProfileData = {
    firstName: "Test",
    useMetric: true,
    dayStartOffset: 0,
  };

  const nonMetricProfile: ProfileData = {
    firstName: "Test",
    useMetric: false,
    dayStartOffset: 0,
  };

  describe("convertMeasurements", () => {
    it("should handle empty data array", () => {
      const result = convertMeasurements([], defaultProfile);
      expect(result).toEqual([]);
    });

    it("should handle null profile", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 70.0,
          trendWeight: 71.0,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          actualFatPercent: 0.15,
          trendFatPercent: 0.16,
        },
      ];

      const result = convertMeasurements(apiMeasurements, null);

      expect(result).toHaveLength(1);
      expect(result[0].actualWeight).toBeCloseTo(70.0 * 2.20462262); // Should convert to lbs
      expect(result[0].trendWeight).toBeCloseTo(71.0 * 2.20462262);
    });

    it("should convert kg to lbs for non-metric users", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 70.0, // 70 kg
          trendWeight: 71.0, // 71 kg
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          actualFatPercent: 0.15,
          trendFatPercent: 0.16,
        },
      ];

      const result = convertMeasurements(apiMeasurements, nonMetricProfile);

      expect(result).toHaveLength(1);
      expect(result[0].actualWeight).toBeCloseTo(154.32); // 70 * 2.20462262
      expect(result[0].trendWeight).toBeCloseTo(156.53); // 71 * 2.20462262
      expect(result[0].date).toEqual(LocalDate.parse("2024-01-01"));
      expect(result[0].source).toBe("computed");
    });

    it("should preserve kg for metric users", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 70.0,
          trendWeight: 71.0,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          actualFatPercent: 0.15,
          trendFatPercent: 0.16,
        },
      ];

      const result = convertMeasurements(apiMeasurements, defaultProfile);

      expect(result).toHaveLength(1);
      expect(result[0].actualWeight).toBe(70.0);
      expect(result[0].trendWeight).toBe(71.0);
    });

    it("should calculate fat/lean mass correctly after weight conversion", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 100.0, // 100 kg
          trendWeight: 100.0, // 100 kg
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          actualFatPercent: 0.2, // 20% fat
          trendFatPercent: 0.2,
        },
      ];

      const result = convertMeasurements(apiMeasurements, nonMetricProfile);

      expect(result).toHaveLength(1);
      const convertedWeight = 100.0 * 2.20462262; // ~220.46 lbs
      expect(result[0].actualWeight).toBeCloseTo(convertedWeight);
      expect(result[0].actualFatMass).toBeCloseTo(convertedWeight * 0.2); // 20% of converted weight
      expect(result[0].actualLeanMass).toBeCloseTo(convertedWeight * 0.8); // 80% of converted weight
    });

    it("should use API-provided trend mass values when available", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 100.0, // 100 kg
          trendWeight: 100.0, // 100 kg
          weightIsInterpolated: false,
          fatIsInterpolated: false,
          actualFatPercent: 0.2, // 20% fat
          trendFatPercent: 0.2,
          trendFatMass: 18.0, // Independent moving average result (kg)
          trendLeanMass: 82.0, // Independent moving average result (kg)
        },
      ];

      // Test metric user (no conversion)
      const metricResult = convertMeasurements(apiMeasurements, defaultProfile);
      expect(metricResult[0].trendFatMass).toBe(18.0);
      expect(metricResult[0].trendLeanMass).toBe(82.0);

      // Test non-metric user (should convert from kg to lbs)
      const nonMetricResult = convertMeasurements(apiMeasurements, nonMetricProfile);
      expect(nonMetricResult[0].trendFatMass).toBeCloseTo(18.0 * 2.20462262);
      expect(nonMetricResult[0].trendLeanMass).toBeCloseTo(82.0 * 2.20462262);
    });

    it("should handle measurements without fat data", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 70.0,
          trendWeight: 71.0,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
      ];

      const result = convertMeasurements(apiMeasurements, defaultProfile);

      expect(result).toHaveLength(1);
      expect(result[0].actualFatMass).toBeUndefined();
      expect(result[0].actualLeanMass).toBeUndefined();
      expect(result[0].trendFatMass).toBeUndefined();
      expect(result[0].trendLeanMass).toBeUndefined();
    });

    it("should handle multiple measurements", () => {
      const apiMeasurements: ApiComputedMeasurement[] = [
        {
          date: "2024-01-01",
          actualWeight: 70.0,
          trendWeight: 71.0,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
        {
          date: "2024-01-02",
          actualWeight: 69.5,
          trendWeight: 70.8,
          weightIsInterpolated: true,
          fatIsInterpolated: true,
        },
      ];

      const result = convertMeasurements(apiMeasurements, defaultProfile);

      expect(result).toHaveLength(2);
      expect(result[0].date).toEqual(LocalDate.parse("2024-01-01"));
      expect(result[1].date).toEqual(LocalDate.parse("2024-01-02"));
      expect(result[1].weightIsInterpolated).toBe(true);
      expect(result[1].fatIsInterpolated).toBe(true);
    });
  });
});
