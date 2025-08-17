import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { transformChartData } from "./data-transformers";
import type { DataPoint } from "@/lib/core/interfaces";

describe("data-transformers", () => {
  const createDataPoint = (date: LocalDate, actual: number | null, trend: number, isInterpolated = false, source = "test"): DataPoint => ({
    date,
    actual: actual ?? 0, // Convert null to 0 for the interface
    trend,
    isInterpolated,
    source,
  });

  const sampleDataPoints: DataPoint[] = [
    createDataPoint(LocalDate.of(2024, 1, 1), 180.5, 181.0, false),
    createDataPoint(LocalDate.of(2024, 1, 2), null, 181.2, true), // interpolated
    createDataPoint(LocalDate.of(2024, 1, 3), 179.8, 181.1, false),
    createDataPoint(LocalDate.of(2024, 1, 4), 180.2, 180.9, false),
  ];

  describe("transformChartData", () => {
    it("should transform data for weight mode", () => {
      const result = transformChartData(sampleDataPoints, "weight", 0.1);

      expect(result.actualData).toEqual([
        [1704067200000, 180.5], // epoch for 2024-01-01
        [1704153600000, null], // interpolated, so null
        [1704240000000, 179.8],
        [1704326400000, 180.2],
      ]);

      expect(result.interpolatedData).toEqual([
        [1704067200000, null], // not interpolated, so null
        [1704153600000, null], // interpolated but actual is null
        [1704240000000, null], // not interpolated, so null
        [1704326400000, null], // not interpolated, so null
      ]);

      expect(result.trendData).toEqual([
        [1704067200000, 181.0],
        [1704153600000, 181.2],
        [1704240000000, 181.1],
        [1704326400000, 180.9],
      ]);
    });

    it("should apply percentage multiplier for fatpercent mode", () => {
      const fatPercentData = [createDataPoint(LocalDate.of(2024, 1, 1), 0.25, 0.26, false), createDataPoint(LocalDate.of(2024, 1, 2), 0.24, 0.255, false)];

      const result = transformChartData(fatPercentData, "fatpercent", 0.001);

      expect(result.actualData).toEqual([
        [1704067200000, 25], // 0.25 * 100
        [1704153600000, 24], // 0.24 * 100
      ]);

      expect(result.trendData).toEqual([
        [1704067200000, 26], // 0.26 * 100
        [1704153600000, 25.5], // 0.255 * 100
      ]);
    });

    it("should handle null actual values", () => {
      const dataWithNulls = [createDataPoint(LocalDate.of(2024, 1, 1), null, 180.0, false), createDataPoint(LocalDate.of(2024, 1, 2), 179.5, 180.1, false)];

      const result = transformChartData(dataWithNulls, "weight", 0.1);

      expect(result.actualData).toEqual([
        [1704067200000, null],
        [1704153600000, 179.5],
      ]);
    });

    it("should create projection data correctly", () => {
      const result = transformChartData(sampleDataPoints, "weight", 0.2);
      const lastDataPoint = sampleDataPoints[sampleDataPoints.length - 1];
      const lastEpoch = lastDataPoint.date.toEpochDay() * 86400000;
      const projectionEpoch = lastDataPoint.date.plusDays(6).toEpochDay() * 86400000;

      expect(result.projectionsData).toEqual([
        [lastEpoch, 180.9], // last trend value
        [projectionEpoch, 182.1], // trend + slope * 6 days = 180.9 + 0.2 * 6
      ]);
    });

    it("should create sinkers data for actual readings", () => {
      const result = transformChartData(sampleDataPoints, "weight", 0.1);

      expect(result.actualSinkersData).toEqual([
        [1704067200000, 180.5, 181.0, null], // actual reading
        [1704153600000, null, null, null], // interpolated, so nulls
        [1704240000000, 179.8, 181.1, null], // actual reading
        [1704326400000, 180.2, 180.9, null], // actual reading
      ]);
    });

    it("should create sinkers data for interpolated readings", () => {
      const dataWithInterpolation = [
        createDataPoint(LocalDate.of(2024, 1, 1), 180.5, 181.0, false),
        createDataPoint(LocalDate.of(2024, 1, 2), 179.9, 181.2, true), // interpolated with value
      ];

      const result = transformChartData(dataWithInterpolation, "weight", 0.1);

      expect(result.interpolatedSinkersData).toEqual([
        [1704067200000, null, null, null], // not interpolated, so nulls
        [1704153600000, 179.9, 181.2, null], // interpolated with actual value
      ]);
    });

    it("should handle interpolated data with null actual values", () => {
      const dataWithNullInterpolation = [
        createDataPoint(LocalDate.of(2024, 1, 1), 180.5, 181.0, false),
        createDataPoint(LocalDate.of(2024, 1, 2), null, 181.2, true), // interpolated with null actual
      ];

      const result = transformChartData(dataWithNullInterpolation, "weight", 0.1);

      expect(result.interpolatedData).toEqual([
        [1704067200000, null], // not interpolated
        [1704153600000, null], // interpolated but actual is null
      ]);

      expect(result.interpolatedSinkersData).toEqual([
        [1704067200000, null, null, null], // not interpolated
        [1704153600000, null, 181.2, null], // interpolated with null actual but trend
      ]);
    });

    it("should work with different modes", () => {
      const result1 = transformChartData(sampleDataPoints, "fatmass", 0.1);
      const result2 = transformChartData(sampleDataPoints, "leanmass", 0.1);

      // Should use multiplier of 1 for non-fatpercent modes
      expect(result1.actualData[0][1]).toBe(180.5);
      expect(result2.actualData[0][1]).toBe(180.5);
    });

    it("should handle single data point", () => {
      const singlePoint = [createDataPoint(LocalDate.of(2024, 1, 1), 180.0, 181.0, false)];
      const result = transformChartData(singlePoint, "weight", 0.1);

      expect(result.actualData).toHaveLength(1);
      expect(result.trendData).toHaveLength(1);
      expect(result.projectionsData).toHaveLength(2); // start and end of projection
    });

    it("should handle empty data array", () => {
      expect(() => transformChartData([], "weight", 0.1)).toThrow();
    });

    it("should create correct epoch timestamps", () => {
      const testDate = LocalDate.of(2024, 1, 15);
      const expectedEpoch = testDate.toEpochDay() * 86400000;
      const dataPoint = [createDataPoint(testDate, 180.0, 181.0, false)];

      const result = transformChartData(dataPoint, "weight", 0.1);

      expect(result.actualData[0][0]).toBe(expectedEpoch);
      expect(result.trendData[0][0]).toBe(expectedEpoch);
    });
  });
});
