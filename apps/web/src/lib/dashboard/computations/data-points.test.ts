import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { computeDataPoints } from "./data-points";
import type { Measurement, Mode } from "../../core/interfaces";

describe("data-points", () => {
  // Helper to create measurements
  function createMeasurement(dateStr: string, weight: number, options: Partial<Measurement> = {}): Measurement {
    const date = LocalDate.parse(dateStr);
    return {
      date,
      source: "manual",
      actualWeight: weight,
      trendWeight: weight + 0.1,
      weightIsInterpolated: false,
      fatIsInterpolated: false,
      ...options,
    };
  }

  describe("computeDataPoints", () => {
    describe("weight mode", () => {
      it("should transform weight measurements to data points", () => {
        const measurements: Measurement[] = [createMeasurement("2024-01-01", 80), createMeasurement("2024-01-02", 81), createMeasurement("2024-01-03", 82)];

        const result = computeDataPoints("weight", measurements);

        expect(result).toHaveLength(3);
        expect(result[0]).toMatchObject({
          date: measurements[0].date,
          source: "manual",
          actual: 80,
          trend: 80.1,
          isInterpolated: false,
        });
        expect(result[1].actual).toBe(81);
        expect(result[2].actual).toBe(82);
      });

      it("should handle interpolated weight measurements", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, { weightIsInterpolated: false }),
          createMeasurement("2024-01-02", 81, { weightIsInterpolated: true }),
          createMeasurement("2024-01-03", 82, { weightIsInterpolated: false }),
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result[0].isInterpolated).toBe(false);
        expect(result[1].isInterpolated).toBe(true);
        expect(result[2].isInterpolated).toBe(false);
      });
    });

    describe("fat percent mode", () => {
      it("should transform fat percent measurements to data points", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            actualFatPercent: 0.25,
            trendFatPercent: 0.251,
          }),
          createMeasurement("2024-01-02", 81, {
            actualFatPercent: 0.24,
            trendFatPercent: 0.242,
          }),
        ];

        const result = computeDataPoints("fatpercent", measurements);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          actual: 0.25,
          trend: 0.251,
          isInterpolated: false,
        });
        expect(result[1]).toMatchObject({
          actual: 0.24,
          trend: 0.242,
          isInterpolated: false,
        });
      });

      it("should use fat interpolation flag for fat modes", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            actualFatPercent: 0.25,
            trendFatPercent: 0.25,
            fatIsInterpolated: true,
            weightIsInterpolated: false,
          }),
        ];

        const result = computeDataPoints("fatpercent", measurements);

        expect(result[0].isInterpolated).toBe(true);
      });
    });

    describe("fat mass mode", () => {
      it("should transform fat mass measurements to data points", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            actualFatMass: 20,
            trendFatMass: 20.1,
          }),
          createMeasurement("2024-01-02", 81, {
            actualFatMass: 19.44,
            trendFatMass: 19.5,
          }),
        ];

        const result = computeDataPoints("fatmass", measurements);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          actual: 20,
          trend: 20.1,
        });
        expect(result[1]).toMatchObject({
          actual: 19.44,
          trend: 19.5,
        });
      });
    });

    describe("lean mass mode", () => {
      it("should transform lean mass measurements to data points", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            actualLeanMass: 60,
            trendLeanMass: 60.1,
          }),
          createMeasurement("2024-01-02", 81, {
            actualLeanMass: 61.56,
            trendLeanMass: 61.5,
          }),
        ];

        const result = computeDataPoints("leanmass", measurements);

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          actual: 60,
          trend: 60.1,
        });
        expect(result[1]).toMatchObject({
          actual: 61.56,
          trend: 61.5,
        });
      });
    });

    describe("sorting and filtering", () => {
      it("should sort measurements by date", () => {
        const measurements: Measurement[] = [createMeasurement("2024-01-03", 82), createMeasurement("2024-01-01", 80), createMeasurement("2024-01-02", 81)];

        const result = computeDataPoints("weight", measurements);

        expect(result[0].date.toString()).toBe("2024-01-01");
        expect(result[1].date.toString()).toBe("2024-01-02");
        expect(result[2].date.toString()).toBe("2024-01-03");
      });

      it("should exclude undefined values at the beginning", () => {
        // Create measurements with undefined actualWeight by omitting it
        const measurements: Measurement[] = [
          {
            date: LocalDate.parse("2024-01-01"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
          {
            date: LocalDate.parse("2024-01-02"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
          createMeasurement("2024-01-03", 80),
          createMeasurement("2024-01-04", 81),
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result).toHaveLength(2);
        expect(result[0].date.toString()).toBe("2024-01-03");
        expect(result[0].actual).toBe(80);
      });

      it("should exclude undefined values at the end", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80),
          createMeasurement("2024-01-02", 81),
          {
            date: LocalDate.parse("2024-01-03"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
          {
            date: LocalDate.parse("2024-01-04"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result).toHaveLength(2);
        expect(result[1].date.toString()).toBe("2024-01-02");
        expect(result[1].actual).toBe(81);
      });

      it("should keep undefined values in the middle", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80),
          {
            date: LocalDate.parse("2024-01-02"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
          createMeasurement("2024-01-03", 82),
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result).toHaveLength(3);
        expect(result[1].actual).toBeUndefined();
        expect(result[1].trend).toBe(0.1); // trend is still there
      });

      it("should handle all undefined values", () => {
        const measurements: Measurement[] = [
          {
            date: LocalDate.parse("2024-01-01"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
          {
            date: LocalDate.parse("2024-01-02"),
            source: "manual",
            // actualWeight is intentionally undefined
            trendWeight: 0.1,
            weightIsInterpolated: false,
            fatIsInterpolated: false,
          } as Measurement,
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result).toHaveLength(0);
      });
    });

    describe("fat mode edge cases", () => {
      it("should handle measurements without fat data in fat mode", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80), // No fat data
          createMeasurement("2024-01-02", 81, {
            actualFatPercent: 0.25,
            trendFatPercent: 0.25,
          }),
          createMeasurement("2024-01-03", 82), // No fat data
        ];

        const result = computeDataPoints("fatpercent", measurements);

        // Should only include the measurement with fat data
        expect(result).toHaveLength(1);
        expect(result[0].date.toString()).toBe("2024-01-02");
        expect(result[0].actual).toBe(0.25);
      });

      it("should handle mixed interpolation states", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            actualFatMass: 20,
            trendFatMass: 20,
            weightIsInterpolated: true,
            fatIsInterpolated: false,
          }),
          createMeasurement("2024-01-02", 81, {
            actualFatMass: 19.5,
            trendFatMass: 19.7,
            weightIsInterpolated: false,
            fatIsInterpolated: true,
          }),
        ];

        const weightResult = computeDataPoints("weight", measurements);
        const fatResult = computeDataPoints("fatmass", measurements);

        // Weight mode uses weightIsInterpolated
        expect(weightResult[0].isInterpolated).toBe(true);
        expect(weightResult[1].isInterpolated).toBe(false);

        // Fat mode uses fatIsInterpolated
        expect(fatResult[0].isInterpolated).toBe(false);
        expect(fatResult[1].isInterpolated).toBe(true);
      });
    });

    describe("all modes", () => {
      it("should handle all modes correctly", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 100, {
            actualFatPercent: 0.3,
            actualFatMass: 30,
            actualLeanMass: 70,
            trendWeight: 100.1,
            trendFatPercent: 0.301,
            trendFatMass: 30.1,
            trendLeanMass: 70.1,
          }),
        ];

        const modes: Mode[] = ["weight", "fatpercent", "fatmass", "leanmass"];
        const expectedActuals = [100, 0.3, 30, 70];
        const expectedTrends = [100.1, 0.301, 30.1, 70.1];

        modes.forEach((mode, index) => {
          const result = computeDataPoints(mode, measurements);
          expect(result[0].actual).toBe(expectedActuals[index]);
          expect(result[0].trend).toBe(expectedTrends[index]);
        });
      });
    });

    describe("empty and edge cases", () => {
      it("should handle empty measurements array", () => {
        const result = computeDataPoints("weight", []);
        expect(result).toEqual([]);
      });

      it("should preserve all measurement properties", () => {
        const measurements: Measurement[] = [
          createMeasurement("2024-01-01", 80, {
            source: "withings",
            weightIsInterpolated: true,
          }),
        ];

        const result = computeDataPoints("weight", measurements);

        expect(result[0].source).toBe("withings");
        expect(result[0].date.toString()).toBe("2024-01-01");
      });

      it("should handle large datasets efficiently", () => {
        const measurements = Array.from({ length: 1000 }, (_, i) => {
          const date = LocalDate.parse("2024-01-01").plusDays(i);
          return createMeasurement(date.toString(), 80 + i * 0.01);
        });

        const startTime = performance.now();
        const result = computeDataPoints("weight", measurements);
        const endTime = performance.now();

        expect(result).toHaveLength(1000);
        expect(endTime - startTime).toBeLessThan(50); // Should be fast
      });
    });
  });
});
