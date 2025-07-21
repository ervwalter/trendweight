import { describe, it, expect } from "vitest";
import { LocalDate } from "@js-joda/core";
import { convertToSourceMeasurements } from "./conversion";
import type { ProfileData, SourceData } from "../../core/interfaces";

describe("conversion", () => {
  // Default profile for testing
  const defaultProfile: ProfileData = {
    firstName: "Test",
    useMetric: true,
    dayStartOffset: 0,
  };

  describe("convertToSourceMeasurements", () => {
    it("should handle empty data array", () => {
      const result = convertToSourceMeasurements([], defaultProfile);
      expect(result).toEqual([]);
    });

    it("should handle source data with no measurements", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: undefined,
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);
      expect(result).toEqual([]);
    });

    it("should handle source data with empty measurements array", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);
      expect(result).toEqual([]);
    });

    it("should convert basic measurement correctly", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:30:00",
              weight: 75.5,
            },
          ],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        date: LocalDate.parse("2024-01-15"),
        source: "withings",
        weight: 75.5,
        weightIsInterpolated: false,
      });
      expect(result[0].timestamp.toString()).toContain("2024-01-15T08:30");
    });

    it("should convert kg to lbs when useMetric is false", () => {
      const data: SourceData[] = [
        {
          source: "fitbit",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 100, // kg
            },
          ],
        },
      ];

      const imperialProfile: ProfileData = {
        ...defaultProfile,
        useMetric: false,
      };

      const result = convertToSourceMeasurements(data, imperialProfile);

      expect(result[0].weight).toBeCloseTo(220.462, 3); // 100kg * 2.20462262
    });

    it("should keep weight in kg when useMetric is true", () => {
      const data: SourceData[] = [
        {
          source: "fitbit",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 100,
            },
          ],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);

      expect(result[0].weight).toBe(100);
    });

    it("should apply dayStartOffset correctly", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "02:00:00", // 2 AM
              weight: 75,
            },
          ],
        },
      ];

      const profileWithOffset: ProfileData = {
        ...defaultProfile,
        dayStartOffset: 4, // Day starts at 4 AM
      };

      const result = convertToSourceMeasurements(data, profileWithOffset);

      // 2 AM - 4 hours = 10 PM previous day
      expect(result[0].date.toString()).toBe("2024-01-14");
    });

    it("should not apply offset when measurement is after day start", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "06:00:00", // 6 AM
              weight: 75,
            },
          ],
        },
      ];

      const profileWithOffset: ProfileData = {
        ...defaultProfile,
        dayStartOffset: 4, // Day starts at 4 AM
      };

      const result = convertToSourceMeasurements(data, profileWithOffset);

      // 6 AM is after 4 AM, so it stays on the same day
      expect(result[0].date.toString()).toBe("2024-01-15");
    });

    it("should preserve fat ratio when present", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 75,
              fatRatio: 0.25,
            },
          ],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);

      expect(result[0].fatRatio).toBe(0.25);
    });

    it("should handle multiple sources correctly", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 75,
            },
          ],
        },
        {
          source: "fitbit",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "09:00:00",
              weight: 75.2,
            },
          ],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe("withings");
      expect(result[1].source).toBe("fitbit");
    });

    it("should handle multiple measurements from same source", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 75,
            },
            {
              date: "2024-01-15",
              time: "20:00:00",
              weight: 75.5,
            },
            {
              date: "2024-01-16",
              time: "08:00:00",
              weight: 74.8,
            },
          ],
        },
      ];

      const result = convertToSourceMeasurements(data, defaultProfile);

      expect(result).toHaveLength(3);
      expect(result.every((m) => m.source === "withings")).toBe(true);
    });

    it("should handle edge case with midnight measurements", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "00:00:00", // Midnight
              weight: 75,
            },
          ],
        },
      ];

      const profileWithOffset: ProfileData = {
        ...defaultProfile,
        dayStartOffset: 4, // Day starts at 4 AM
      };

      const result = convertToSourceMeasurements(data, profileWithOffset);

      // Midnight - 4 hours = 8 PM previous day
      expect(result[0].date.toString()).toBe("2024-01-14");
    });

    it("should handle large dayStartOffset correctly", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "10:00:00",
              weight: 75,
            },
          ],
        },
      ];

      const profileWithLargeOffset: ProfileData = {
        ...defaultProfile,
        dayStartOffset: 12, // Day starts at noon
      };

      const result = convertToSourceMeasurements(data, profileWithLargeOffset);

      // 10 AM - 12 hours = 10 PM previous day
      expect(result[0].date.toString()).toBe("2024-01-14");
    });

    it("should use default values when profile fields are undefined", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 100,
            },
          ],
        },
      ];

      const minimalProfile: ProfileData = {
        firstName: "Test",
        useMetric: false, // explicitly set to false to test imperial conversion
        // dayStartOffset is undefined
      };

      const result = convertToSourceMeasurements(data, minimalProfile);

      // Should default to imperial (converts to lbs) when useMetric is undefined/false
      expect(result[0].weight).toBeCloseTo(220.462, 3);
      expect(result[0].date.toString()).toBe("2024-01-15");
    });

    it("should preserve original timestamp for intra-day sorting", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "02:00:00",
              weight: 75,
            },
          ],
        },
      ];

      const profileWithOffset: ProfileData = {
        ...defaultProfile,
        dayStartOffset: 4,
      };

      const result = convertToSourceMeasurements(data, profileWithOffset);

      // Date should be adjusted to previous day
      expect(result[0].date.toString()).toBe("2024-01-14");

      // But timestamp should reflect the adjusted time (2 AM - 4 hours = 10 PM)
      expect(result[0].timestamp.toString()).toContain("2024-01-14T22:00");
    });

    it("should handle conversion precision correctly", () => {
      const data: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-15",
              time: "08:00:00",
              weight: 75.123456789, // Many decimal places
            },
          ],
        },
      ];

      const imperialProfile: ProfileData = {
        ...defaultProfile,
        useMetric: false,
      };

      const result = convertToSourceMeasurements(data, imperialProfile);

      // Should maintain precision through conversion
      const expectedWeight = 75.123456789 * 2.20462262;
      expect(result[0].weight).toBeCloseTo(expectedWeight, 6);
    });
  });
});
