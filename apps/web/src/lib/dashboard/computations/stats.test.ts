import { describe, it, expect, beforeEach } from "vitest";
import { LocalDate } from "@js-joda/core";
import { computeDeltas, computeWeightSlope, computeActiveSlope } from "./stats";
import type { DataPoint, Measurement } from "@/lib/core/interfaces";
import { freezeClock } from "@/test/clock";
import { buildDataPoint, dailyDataPoints } from "@/test/fixtures";

// The clock is frozen at 2024-01-15 for every test; "today" below always means that date.
const TODAY = "2024-01-15";

// Consecutive daily points ending on endIso (inclusive), one per trend value
function dailyPointsEnding(endIso: string, trends: number[]): DataPoint[] {
  const start = LocalDate.parse(endIso).minusDays(trends.length - 1);
  return dailyDataPoints(start.toString(), trends);
}

// A flat series of `count` readings at `trend`
const flat = (count: number, trend = 80): number[] => Array.from({ length: count }, () => trend);

function createMeasurement(dateStr: string, trendWeight: number): Measurement {
  return {
    date: LocalDate.parse(dateStr),
    source: "manual",
    actualWeight: trendWeight,
    trendWeight,
    weightIsInterpolated: false,
    fatIsInterpolated: false,
  };
}

const periods = (dataPoints: DataPoint[], mode: Parameters<typeof computeDeltas>[0] = "weight") => computeDeltas(mode, dataPoints).map((d) => d.period);

describe("stats", () => {
  beforeEach(() => {
    freezeClock("2024-01-15T12:00:00");
  });

  describe("computeDeltas", () => {
    it("returns no deltas for empty data points", () => {
      expect(computeDeltas("weight", [])).toEqual([]);
    });

    it("returns no deltas for a single data point", () => {
      expect(computeDeltas("weight", [buildDataPoint(TODAY, 80)])).toEqual([]);
    });

    describe("staleness threshold", () => {
      it("still reports deltas when the most recent reading is 2 days old", () => {
        // 31 daily readings ending 2024-01-13 (2 days before the frozen today)
        const dataPoints = dailyPointsEnding("2024-01-13", flat(31));

        expect(periods(dataPoints)).toEqual([7, 14, 28]);
      });

      it("reports nothing when the most recent reading is 3 days old", () => {
        const dataPoints = dailyPointsEnding("2024-01-12", flat(31));

        expect(computeDeltas("weight", dataPoints)).toEqual([]);
      });
    });

    describe("yesterday delta", () => {
      it("is reported when the latest reading is today and the previous one is the day before", () => {
        const dataPoints = [buildDataPoint("2024-01-14", 80), buildDataPoint(TODAY, 80.5)];

        const result = computeDeltas("weight", dataPoints);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ period: 1, description: "yesterday" });
        expect(result[0].delta).toBeCloseTo(0.5, 10);
      });

      it("is reported when the latest reading is 1 day old and consecutive with the one before", () => {
        const dataPoints = [buildDataPoint("2024-01-13", 80), buildDataPoint("2024-01-14", 80.5)];

        expect(periods(dataPoints)).toEqual([1]);
      });

      it("is not reported when the latest reading is 2 days old even with consecutive dates", () => {
        const dataPoints = [buildDataPoint("2024-01-12", 80), buildDataPoint("2024-01-13", 80.5)];

        expect(periods(dataPoints)).not.toContain(1);
      });

      it("is not reported when the two latest readings are not on consecutive days", () => {
        const dataPoints = [buildDataPoint("2024-01-13", 80), buildDataPoint(TODAY, 80.5)];

        expect(computeDeltas("weight", dataPoints)).toEqual([]);
      });

      it("reports a negative delta when the trend fell", () => {
        const dataPoints = [buildDataPoint("2024-01-14", 81), buildDataPoint(TODAY, 80)];

        const [delta] = computeDeltas("weight", dataPoints);

        expect(delta.period).toBe(1);
        expect(delta.delta).toBeCloseTo(-1, 10);
      });
    });

    describe("week delta", () => {
      it("is reported when the reading from 7 days ago is at least the 5th most recent (index 4)", () => {
        const dataPoints = [
          buildDataPoint("2024-01-08", 79), // exactly 7 days before today; index 4 when reversed
          buildDataPoint("2024-01-12", 79.2),
          buildDataPoint("2024-01-13", 79.5),
          buildDataPoint("2024-01-14", 79.9),
          buildDataPoint(TODAY, 80),
        ];

        const week = computeDeltas("weight", dataPoints).find((d) => d.period === 7);

        expect(week).toMatchObject({ period: 7, description: "last week" });
        expect(week?.delta).toBeCloseTo(1, 10);
      });

      it("is not reported when the reading from 7 days ago is only the 4th most recent (index 3)", () => {
        const dataPoints = [
          buildDataPoint("2024-01-08", 79), // index 3 when reversed
          buildDataPoint("2024-01-13", 79.5),
          buildDataPoint("2024-01-14", 79.9),
          buildDataPoint(TODAY, 80),
        ];

        expect(periods(dataPoints)).not.toContain(7);
      });

      it("requires a reading on exactly the date 7 days ago", () => {
        // 10 daily readings ending today, minus the one dated 2024-01-08
        const dataPoints = dailyPointsEnding(TODAY, flat(10)).filter((p) => !p.date.equals(LocalDate.parse("2024-01-08")));

        expect(dataPoints).toHaveLength(9);
        expect(periods(dataPoints)).not.toContain(7);
      });
    });

    describe("two week delta", () => {
      it("is not reported when the reading from 14 days ago is at index 8", () => {
        // 2024-01-01 plus the 8 days 2024-01-08..2024-01-15
        const dataPoints = [buildDataPoint("2024-01-01", 78), ...dailyPointsEnding(TODAY, flat(8, 79.4))];

        expect(periods(dataPoints)).not.toContain(14);
      });

      it("is reported when the reading from 14 days ago is at index 9", () => {
        // 2024-01-01 plus the 9 days 2024-01-07..2024-01-15
        const dataPoints = [buildDataPoint("2024-01-01", 78), ...dailyPointsEnding(TODAY, flat(9, 79.4))];

        const twoWeeks = computeDeltas("weight", dataPoints).find((d) => d.period === 14);

        expect(twoWeeks).toMatchObject({ period: 14, description: "two weeks ago" });
        expect(twoWeeks?.delta).toBeCloseTo(1.4, 10);
      });
    });

    describe("month delta", () => {
      it("is not reported when the reading from 28 days ago is at index 18", () => {
        // 2023-12-18 plus the 18 days 2023-12-29..2024-01-15
        const dataPoints = [buildDataPoint("2023-12-18", 75), ...dailyPointsEnding(TODAY, flat(18, 77.8))];

        expect(periods(dataPoints)).not.toContain(28);
      });

      it("is reported when the reading from 28 days ago is at index 19", () => {
        // 2023-12-18 plus the 19 days 2023-12-28..2024-01-15
        const dataPoints = [buildDataPoint("2023-12-18", 75), ...dailyPointsEnding(TODAY, flat(19, 77.8))];

        const month = computeDeltas("weight", dataPoints).find((d) => d.period === 28);

        expect(month).toMatchObject({ period: 28, description: "a month ago" });
        expect(month?.delta).toBeCloseTo(2.8, 10);
      });
    });

    it("reports the periods in the order 1, 7, 14, 28 when every one is available", () => {
      const trends = Array.from({ length: 29 }, (_, i) => 75 + i * 0.1);
      const dataPoints = dailyPointsEnding(TODAY, trends);

      const result = computeDeltas("weight", dataPoints);

      expect(result.map((d) => d.period)).toEqual([1, 7, 14, 28]);
      expect(result.map((d) => d.description)).toEqual(["yesterday", "last week", "two weeks ago", "a month ago"]);
      expect(result[0].delta).toBeCloseTo(0.1, 10);
      expect(result[1].delta).toBeCloseTo(0.7, 10);
      expect(result[2].delta).toBeCloseTo(1.4, 10);
      expect(result[3].delta).toBeCloseTo(2.8, 10);
    });

    describe("rounding", () => {
      it("rounds weight values to one decimal before subtracting", () => {
        // 80.04 -> 80.0 and 80.55 -> 80.6, so the delta is 0.6 rather than the raw 0.51
        const dataPoints = [buildDataPoint("2024-01-14", 80.04), buildDataPoint(TODAY, 80.55)];

        const [delta] = computeDeltas("weight", dataPoints);

        expect(delta.delta).toBeCloseTo(0.6, 10);
      });

      it("rounds fat percentage ratios to three decimals before subtracting", () => {
        // 0.2341 -> 0.234 and 0.2345 -> 0.235, so the delta is 0.001 rather than the raw 0.0004
        const dataPoints = [buildDataPoint("2024-01-14", 0.2341), buildDataPoint(TODAY, 0.2345)];

        const [delta] = computeDeltas("fatpercent", dataPoints);

        expect(delta.delta).toBeCloseTo(0.001, 10);
      });

      it("rounds weight values that display the same to a zero delta", () => {
        // 160.14 and 160.06 both display as 160.1
        const dataPoints = [buildDataPoint("2024-01-14", 160.14), buildDataPoint(TODAY, 160.06)];

        const [delta] = computeDeltas("weight", dataPoints);

        expect(delta.delta).toBe(0);
      });

      it("rounds fat percentage ratios that display the same to a zero delta", () => {
        const dataPoints = [buildDataPoint("2024-01-14", 0.40024), buildDataPoint(TODAY, 0.40025)];

        const [delta] = computeDeltas("fatpercent", dataPoints);

        expect(delta.delta).toBe(0);
      });

      it.each(["fatmass", "leanmass"] as const)("rounds %s values like weight (one decimal)", (mode) => {
        const dataPoints = [buildDataPoint("2024-01-14", 25.16), buildDataPoint(TODAY, 25.13)];

        const [delta] = computeDeltas(mode, dataPoints);

        expect(delta.delta).toBeCloseTo(-0.1, 10);
      });

      it("keeps small fat percentage changes instead of rounding them away", () => {
        const dataPoints = [
          buildDataPoint("2024-01-08", 0.41),
          buildDataPoint("2024-01-10", 0.409),
          buildDataPoint("2024-01-12", 0.408),
          buildDataPoint("2024-01-13", 0.407),
          buildDataPoint("2024-01-14", 0.4065),
          buildDataPoint(TODAY, 0.4055),
        ];

        const result = computeDeltas("fatpercent", dataPoints);

        expect(result.map((d) => d.period)).toEqual([1, 7]);
        expect(result[0].delta).toBeCloseTo(-0.001, 10); // 0.406 - 0.407
        expect(result[1].delta).toBeCloseTo(-0.004, 10); // 0.406 - 0.410
      });
    });
  });

  describe("computeWeightSlope", () => {
    it("returns 0 for empty measurements", () => {
      expect(computeWeightSlope([])).toBe(0);
    });

    it("returns 0 for a single measurement", () => {
      expect(computeWeightSlope([createMeasurement(TODAY, 80)])).toBe(0);
    });

    it("calculates a positive slope for increasing weight", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => createMeasurement(LocalDate.parse("2024-01-01").plusDays(i).toString(), 80 + i * 0.1));

      expect(computeWeightSlope(measurements)).toBeCloseTo(0.1, 5);
    });

    it("calculates a negative slope for decreasing weight", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => createMeasurement(LocalDate.parse("2024-01-01").plusDays(i).toString(), 80 - i * 0.1));

      expect(computeWeightSlope(measurements)).toBeCloseTo(-0.1, 5);
    });

    it("uses only the last 14 measurements", () => {
      const measurements = Array.from({ length: 30 }, (_, i) =>
        createMeasurement(LocalDate.parse("2024-01-01").plusDays(i).toString(), i < 16 ? 80 : 80 + (i - 16) * 0.1),
      );

      expect(computeWeightSlope(measurements)).toBeCloseTo(0.1, 5);
    });

    it("skips measurements with a null trend weight", () => {
      const measurements = [
        createMeasurement("2024-01-01", 80),
        { ...createMeasurement("2024-01-02", 0), trendWeight: null as unknown as number },
        createMeasurement("2024-01-03", 81),
        createMeasurement("2024-01-04", 81.5),
      ];

      // Regression over the three remaining points (x = 0, 1, 2; y = 80, 81, 81.5)
      expect(computeWeightSlope(measurements)).toBeCloseTo(0.75, 10);
    });

    it("returns 0 for a flat trend", () => {
      const measurements = Array.from({ length: 14 }, (_, i) => createMeasurement(LocalDate.parse("2024-01-01").plusDays(i).toString(), 80));

      expect(computeWeightSlope(measurements)).toBeCloseTo(0, 5);
    });

    it("handles very large datasets", () => {
      const measurements = Array.from({ length: 1000 }, (_, i) => createMeasurement(LocalDate.parse("2024-01-01").plusDays(i).toString(), 80 + i * 0.01));

      expect(computeWeightSlope(measurements)).toBeCloseTo(0.01, 5);
    });
  });

  describe("computeActiveSlope", () => {
    it("returns 0 for empty data points", () => {
      expect(computeActiveSlope("weight", [])).toBe(0);
    });

    it("returns 0 for a single data point", () => {
      expect(computeActiveSlope("weight", [buildDataPoint(TODAY, 80)])).toBe(0);
    });

    it("uses the last 14 points for weight mode", () => {
      const trends = Array.from({ length: 20 }, (_, i) => (i < 6 ? 85 : 80 + i * 0.1));

      expect(computeActiveSlope("weight", dailyDataPoints("2024-01-01", trends))).toBeCloseTo(0.1, 5);
    });

    it.each(["fatpercent", "fatmass", "leanmass"] as const)("uses the last 28 points for %s mode", (mode) => {
      // 35 points: the first 14 are flat, the last 21 rise by 0.1 per day. The 28-point window
      // sees 7 flat + 21 rising (slope below 0.1); a 14-point window sees only the rise (0.1).
      const trends = Array.from({ length: 35 }, (_, i) => (i < 14 ? 80 : 80 + (i - 14) * 0.1));

      const slope = computeActiveSlope(mode, dailyDataPoints("2024-01-01", trends));

      expect(slope).toBeGreaterThan(0);
      expect(slope).toBeLessThan(0.1);
      expect(computeActiveSlope("weight", dailyDataPoints("2024-01-01", trends))).toBeCloseTo(0.1, 5);
    });

    it("uses trend values rather than actual readings", () => {
      const dataPoints = Array.from({ length: 14 }, (_, i) => buildDataPoint(LocalDate.parse("2024-01-01").plusDays(i), 80 + i * 0.1, 80 + (i % 2) * 5));

      expect(computeActiveSlope("weight", dataPoints)).toBeCloseTo(0.1, 5);
    });

    it("calculates a slope from just two points", () => {
      const dataPoints = [buildDataPoint("2024-01-14", 80), buildDataPoint(TODAY, 81)];

      expect(computeActiveSlope("weight", dataPoints)).toBeCloseTo(1, 5);
      expect(computeActiveSlope("fatmass", dataPoints)).toBeCloseTo(1, 5);
    });
  });
});
