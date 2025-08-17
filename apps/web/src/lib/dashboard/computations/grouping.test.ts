import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { groupAndSelectFirstByDay, filterAndGroupFatMeasurements } from "./grouping";
import type { SourceMeasurement } from "@/lib/core/interfaces";

describe("grouping", () => {
  // Helper to create source measurements
  function createMeasurement(dateStr: string, timeStr: string, weight: number, options: Partial<SourceMeasurement> = {}): SourceMeasurement {
    const date = LocalDate.parse(dateStr);
    const [hours, minutes] = timeStr.split(":").map(Number);
    return {
      date,
      timestamp: date.atTime(hours, minutes),
      source: "manual",
      weight,
      ...options,
    };
  }

  describe("groupAndSelectFirstByDay", () => {
    it("should return empty array for empty input", () => {
      const result = groupAndSelectFirstByDay([]);
      expect(result).toEqual([]);
    });

    it("should return single measurement unchanged", () => {
      const measurement = createMeasurement("2024-01-01", "08:00", 80);
      const result = groupAndSelectFirstByDay([measurement]);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(measurement);
    });

    it("should group multiple measurements on same day and select first by time", () => {
      const measurements = [
        createMeasurement("2024-01-01", "14:00", 81), // Later in day
        createMeasurement("2024-01-01", "08:00", 80), // First measurement
        createMeasurement("2024-01-01", "20:00", 82), // Evening
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(80); // Should select the 8am measurement
      expect(result[0].timestamp.toString()).toContain("08:00");
    });

    it("should handle measurements across multiple days", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80),
        createMeasurement("2024-01-02", "09:00", 81),
        createMeasurement("2024-01-03", "07:30", 82),
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(3);
      expect(result.map((m) => m.weight)).toEqual([80, 81, 82]);
    });

    it("should sort results by date", () => {
      const measurements = [
        createMeasurement("2024-01-03", "08:00", 82),
        createMeasurement("2024-01-01", "08:00", 80),
        createMeasurement("2024-01-02", "08:00", 81),
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(3);
      expect(result[0].date.toString()).toBe("2024-01-01");
      expect(result[1].date.toString()).toBe("2024-01-02");
      expect(result[2].date.toString()).toBe("2024-01-03");
    });

    it("should handle multiple measurements per day across multiple days", () => {
      const measurements = [
        // Day 1
        createMeasurement("2024-01-01", "14:00", 80.5),
        createMeasurement("2024-01-01", "08:00", 80),
        // Day 2
        createMeasurement("2024-01-02", "07:00", 81),
        createMeasurement("2024-01-02", "19:00", 81.5),
        // Day 3
        createMeasurement("2024-01-03", "06:30", 82),
        createMeasurement("2024-01-03", "12:00", 82.2),
        createMeasurement("2024-01-03", "22:00", 82.5),
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(3);
      expect(result[0].weight).toBe(80); // 8am on day 1
      expect(result[1].weight).toBe(81); // 7am on day 2
      expect(result[2].weight).toBe(82); // 6:30am on day 3
    });

    it("should preserve measurement properties", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80, {
          source: "withings",
          fatRatio: 0.25,
          weightIsInterpolated: true,
        }),
        createMeasurement("2024-01-01", "14:00", 81, {
          source: "fitbit",
        }),
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(1);
      expect(result[0].source).toBe("withings");
      expect(result[0].fatRatio).toBe(0.25);
      expect(result[0].weightIsInterpolated).toBe(true);
    });

    it("should handle midnight measurements correctly", () => {
      const measurements = [
        createMeasurement("2024-01-01", "00:00", 79.5), // Midnight
        createMeasurement("2024-01-01", "08:00", 80),
        createMeasurement("2024-01-01", "23:59", 80.5), // Just before midnight
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(79.5); // Midnight is first
    });

    it("should handle measurements with same timestamp", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80, { source: "manual" }),
        createMeasurement("2024-01-01", "08:00", 81, { source: "withings" }),
      ];

      const result = groupAndSelectFirstByDay(measurements);

      expect(result).toHaveLength(1);
      // Should still return one of them (implementation dependent)
      expect([80, 81]).toContain(result[0].weight);
    });
  });

  describe("filterAndGroupFatMeasurements", () => {
    it("should return empty array for empty input", () => {
      const result = filterAndGroupFatMeasurements([]);
      expect(result).toEqual([]);
    });

    it("should filter out measurements without fat ratio", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80), // No fat ratio
        createMeasurement("2024-01-02", "08:00", 81, { fatRatio: 0.25 }),
        createMeasurement("2024-01-03", "08:00", 82), // No fat ratio
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(1);
      expect(result[0].weight).toBe(81);
      expect(result[0].fatRatio).toBe(0.25);
    });

    it("should handle fat ratio of 0", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80, { fatRatio: 0 }),
        createMeasurement("2024-01-02", "08:00", 81, { fatRatio: undefined }),
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(1);
      expect(result[0].fatRatio).toBe(0);
    });

    it("should group fat measurements by day", () => {
      const measurements = [
        createMeasurement("2024-01-01", "14:00", 80.5, { fatRatio: 0.26 }),
        createMeasurement("2024-01-01", "08:00", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-02", "08:00", 81, { fatRatio: 0.24 }),
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(2);
      expect(result[0].weight).toBe(80); // First measurement of day 1
      expect(result[0].fatRatio).toBe(0.25);
      expect(result[1].weight).toBe(81);
      expect(result[1].fatRatio).toBe(0.24);
    });

    it("should sort by timestamp before grouping", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-02", "14:00", 82, { fatRatio: 0.27 }),
        createMeasurement("2024-01-02", "07:00", 81, { fatRatio: 0.26 }), // Earlier
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(2);
      expect(result[1].weight).toBe(81); // Should select 7am measurement for day 2
      expect(result[1].fatRatio).toBe(0.26);
    });

    it("should preserve all measurement properties", () => {
      const measurements = [
        createMeasurement("2024-01-01", "08:00", 80, {
          fatRatio: 0.25,
          source: "withings",
          fatRatioIsInterpolated: true,
          weightIsInterpolated: false,
        }),
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        weight: 80,
        fatRatio: 0.25,
        source: "withings",
        fatRatioIsInterpolated: true,
        weightIsInterpolated: false,
      });
    });

    it("should handle mix of measurements with and without fat across days", () => {
      const measurements = [
        // Day 1: mix
        createMeasurement("2024-01-01", "08:00", 80, { fatRatio: 0.25 }),
        createMeasurement("2024-01-01", "14:00", 80.5), // No fat
        // Day 2: only without fat
        createMeasurement("2024-01-02", "08:00", 81),
        createMeasurement("2024-01-02", "20:00", 81.5),
        // Day 3: multiple with fat
        createMeasurement("2024-01-03", "07:00", 82, { fatRatio: 0.24 }),
        createMeasurement("2024-01-03", "19:00", 82.5, { fatRatio: 0.245 }),
      ];

      const result = filterAndGroupFatMeasurements(measurements);

      expect(result).toHaveLength(2);
      expect(result[0].date.toString()).toBe("2024-01-01");
      expect(result[0].fatRatio).toBe(0.25);
      expect(result[1].date.toString()).toBe("2024-01-03");
      expect(result[1].fatRatio).toBe(0.24); // First of the day
    });

    it("should handle large datasets efficiently", () => {
      // Create 365 days of measurements, some with fat ratio
      const measurements = Array.from({ length: 365 }, (_, i) => {
        const date = LocalDate.parse("2024-01-01").plusDays(i);
        const hasFat = i % 3 === 0; // Every third day has fat ratio
        return createMeasurement(date.toString(), "08:00", 80 + i * 0.01, hasFat ? { fatRatio: 0.25 - i * 0.0001 } : {});
      });

      const result = filterAndGroupFatMeasurements(measurements);

      // Should have ~122 days with fat measurements (365 / 3)
      expect(result.length).toBeGreaterThan(120);
      expect(result.length).toBeLessThan(125);

      // All should have fat ratio
      expect(result.every((m) => m.fatRatio !== undefined)).toBe(true);

      // Should be sorted by date
      for (let i = 1; i < result.length; i++) {
        expect(result[i].date.isAfter(result[i - 1].date)).toBe(true);
      }
    });
  });
});
