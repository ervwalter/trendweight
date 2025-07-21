import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalDate } from "@js-joda/core";
import { computeMeasurements } from "./measurements";
import type { ProfileData, SourceData, Measurement } from "../../core/interfaces";

// Mock all the dependencies
vi.mock("./conversion", () => ({
  convertToSourceMeasurements: vi.fn(),
}));

vi.mock("./grouping", () => ({
  groupAndSelectFirstByDay: vi.fn(),
  filterAndGroupFatMeasurements: vi.fn(),
}));

vi.mock("./interpolation", () => ({
  interpolateWeightMeasurements: vi.fn(),
  interpolateFatMeasurements: vi.fn(),
}));

vi.mock("./trend-calculations", () => ({
  computeWeightTrends: vi.fn(),
  computeFatTrends: vi.fn(),
}));

import { convertToSourceMeasurements } from "./conversion";
import { groupAndSelectFirstByDay, filterAndGroupFatMeasurements } from "./grouping";
import { interpolateWeightMeasurements, interpolateFatMeasurements } from "./interpolation";
import { computeWeightTrends, computeFatTrends } from "./trend-calculations";

describe("measurements", () => {
  const mockProfile: ProfileData = {
    firstName: "Test",
    useMetric: true,
    dayStartOffset: 4,
  };

  const mockSourceData: SourceData[] = [
    {
      source: "withings",
      lastUpdate: "2024-01-15T10:00:00Z",
      measurements: [
        {
          date: "2024-01-01",
          time: "08:00:00",
          weight: 80,
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeMeasurements", () => {
    it("should process weight measurements through the complete pipeline", () => {
      const mockSourceMeasurements = [
        {
          date: LocalDate.parse("2024-01-01"),
          timestamp: LocalDate.parse("2024-01-01").atTime(8, 0),
          source: "withings",
          weight: 80,
        },
      ];

      const mockGroupedMeasurements = [...mockSourceMeasurements];
      const mockInterpolatedMeasurements = [...mockSourceMeasurements];
      const mockFinalMeasurements: Measurement[] = [
        {
          date: LocalDate.parse("2024-01-01"),
          source: "withings",
          actualWeight: 80,
          trendWeight: 80,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
      ];

      vi.mocked(convertToSourceMeasurements).mockReturnValue(mockSourceMeasurements);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue(mockGroupedMeasurements);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue(mockInterpolatedMeasurements);
      vi.mocked(computeWeightTrends).mockReturnValue(mockFinalMeasurements);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue([]);

      const result = computeMeasurements(mockSourceData, mockProfile);

      // Verify the pipeline calls in order
      expect(convertToSourceMeasurements).toHaveBeenCalledWith(mockSourceData, mockProfile);
      expect(groupAndSelectFirstByDay).toHaveBeenCalledWith(mockSourceMeasurements);
      expect(interpolateWeightMeasurements).toHaveBeenCalledWith(mockGroupedMeasurements);
      expect(computeWeightTrends).toHaveBeenCalledWith(mockInterpolatedMeasurements);
      expect(filterAndGroupFatMeasurements).toHaveBeenCalledWith(mockSourceMeasurements);

      // Verify fat processing was skipped (no fat measurements)
      expect(interpolateFatMeasurements).not.toHaveBeenCalled();
      expect(computeFatTrends).not.toHaveBeenCalled();

      expect(result).toEqual(mockFinalMeasurements);
    });

    it("should process fat measurements when available", () => {
      const mockSourceMeasurements = [
        {
          date: LocalDate.parse("2024-01-01"),
          timestamp: LocalDate.parse("2024-01-01").atTime(8, 0),
          source: "withings",
          weight: 80,
          fatRatio: 0.25,
        },
      ];

      const mockFatMeasurements = [...mockSourceMeasurements];
      const mockInterpolatedFatMeasurements = [...mockSourceMeasurements];
      const mockWeightMeasurements: Measurement[] = [
        {
          date: LocalDate.parse("2024-01-01"),
          source: "withings",
          actualWeight: 80,
          trendWeight: 80,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
      ];
      const mockFinalMeasurements: Measurement[] = [
        {
          ...mockWeightMeasurements[0],
          actualFatPercent: 0.25,
          actualFatMass: 20,
          actualLeanMass: 60,
          trendFatPercent: 0.25,
          trendFatMass: 20,
          trendLeanMass: 60,
        },
      ];

      vi.mocked(convertToSourceMeasurements).mockReturnValue(mockSourceMeasurements);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue(mockSourceMeasurements);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue(mockSourceMeasurements);
      vi.mocked(computeWeightTrends).mockReturnValue(mockWeightMeasurements);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue(mockFatMeasurements);
      vi.mocked(interpolateFatMeasurements).mockReturnValue(mockInterpolatedFatMeasurements);
      vi.mocked(computeFatTrends).mockReturnValue(mockFinalMeasurements);

      const result = computeMeasurements(mockSourceData, mockProfile);

      // Verify fat processing was called
      expect(interpolateFatMeasurements).toHaveBeenCalledWith(mockFatMeasurements);
      expect(computeFatTrends).toHaveBeenCalledWith(mockInterpolatedFatMeasurements, mockWeightMeasurements);

      expect(result).toEqual(mockFinalMeasurements);
    });

    it("should handle empty source data", () => {
      const emptySourceData: SourceData[] = [];

      vi.mocked(convertToSourceMeasurements).mockReturnValue([]);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue([]);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue([]);
      vi.mocked(computeWeightTrends).mockReturnValue([]);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue([]);

      const result = computeMeasurements(emptySourceData, mockProfile);

      expect(result).toEqual([]);
      expect(interpolateFatMeasurements).not.toHaveBeenCalled();
      expect(computeFatTrends).not.toHaveBeenCalled();
    });

    it("should handle multiple data sources", () => {
      const multipleSourceData: SourceData[] = [
        {
          source: "withings",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-01",
              time: "08:00:00",
              weight: 80,
            },
          ],
        },
        {
          source: "fitbit",
          lastUpdate: "2024-01-15T10:00:00Z",
          measurements: [
            {
              date: "2024-01-02",
              time: "09:00:00",
              weight: 81,
            },
          ],
        },
      ];

      const mockCombinedMeasurements = [
        {
          date: LocalDate.parse("2024-01-01"),
          timestamp: LocalDate.parse("2024-01-01").atTime(8, 0),
          source: "withings",
          weight: 80,
        },
        {
          date: LocalDate.parse("2024-01-02"),
          timestamp: LocalDate.parse("2024-01-02").atTime(9, 0),
          source: "fitbit",
          weight: 81,
        },
      ];

      vi.mocked(convertToSourceMeasurements).mockReturnValue(mockCombinedMeasurements);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue(mockCombinedMeasurements);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue(mockCombinedMeasurements);
      vi.mocked(computeWeightTrends).mockReturnValue([]);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue([]);

      computeMeasurements(multipleSourceData, mockProfile);

      expect(convertToSourceMeasurements).toHaveBeenCalledWith(multipleSourceData, mockProfile);
    });

    it("should pass profile settings through conversion", () => {
      const customProfile: ProfileData = {
        firstName: "Test",
        useMetric: false, // Imperial
        dayStartOffset: 6, // Day starts at 6 AM
      };

      vi.mocked(convertToSourceMeasurements).mockReturnValue([]);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue([]);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue([]);
      vi.mocked(computeWeightTrends).mockReturnValue([]);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue([]);

      computeMeasurements(mockSourceData, customProfile);

      expect(convertToSourceMeasurements).toHaveBeenCalledWith(mockSourceData, customProfile);
    });

    it("should maintain measurement order through pipeline", () => {
      const orderedMeasurements = [
        {
          date: LocalDate.parse("2024-01-01"),
          timestamp: LocalDate.parse("2024-01-01").atTime(8, 0),
          source: "withings",
          weight: 80,
        },
        {
          date: LocalDate.parse("2024-01-02"),
          timestamp: LocalDate.parse("2024-01-02").atTime(8, 0),
          source: "withings",
          weight: 81,
        },
        {
          date: LocalDate.parse("2024-01-03"),
          timestamp: LocalDate.parse("2024-01-03").atTime(8, 0),
          source: "withings",
          weight: 82,
        },
      ];

      const finalMeasurements: Measurement[] = orderedMeasurements.map((m) => ({
        date: m.date,
        source: m.source,
        actualWeight: m.weight,
        trendWeight: m.weight,
        weightIsInterpolated: false,
        fatIsInterpolated: false,
      }));

      vi.mocked(convertToSourceMeasurements).mockReturnValue(orderedMeasurements);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue(orderedMeasurements);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue(orderedMeasurements);
      vi.mocked(computeWeightTrends).mockReturnValue(finalMeasurements);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue([]);

      const result = computeMeasurements(mockSourceData, mockProfile);

      expect(result).toHaveLength(3);
      expect(result[0].date.toString()).toBe("2024-01-01");
      expect(result[1].date.toString()).toBe("2024-01-02");
      expect(result[2].date.toString()).toBe("2024-01-03");
    });

    it("should handle mixed weight and fat measurements", () => {
      const mixedMeasurements = [
        {
          date: LocalDate.parse("2024-01-01"),
          timestamp: LocalDate.parse("2024-01-01").atTime(8, 0),
          source: "withings",
          weight: 80,
          fatRatio: 0.25,
        },
        {
          date: LocalDate.parse("2024-01-02"),
          timestamp: LocalDate.parse("2024-01-02").atTime(8, 0),
          source: "withings",
          weight: 81,
          // No fat ratio
        },
        {
          date: LocalDate.parse("2024-01-03"),
          timestamp: LocalDate.parse("2024-01-03").atTime(8, 0),
          source: "withings",
          weight: 82,
          fatRatio: 0.24,
        },
      ];

      const fatOnlyMeasurements = [mixedMeasurements[0], mixedMeasurements[2]];

      vi.mocked(convertToSourceMeasurements).mockReturnValue(mixedMeasurements);
      vi.mocked(groupAndSelectFirstByDay).mockReturnValue(mixedMeasurements);
      vi.mocked(interpolateWeightMeasurements).mockReturnValue(mixedMeasurements);
      vi.mocked(computeWeightTrends).mockReturnValue([]);
      vi.mocked(filterAndGroupFatMeasurements).mockReturnValue(fatOnlyMeasurements);
      vi.mocked(interpolateFatMeasurements).mockReturnValue(fatOnlyMeasurements);
      vi.mocked(computeFatTrends).mockReturnValue([]);

      computeMeasurements(mockSourceData, mockProfile);

      expect(filterAndGroupFatMeasurements).toHaveBeenCalledWith(mixedMeasurements);
      expect(interpolateFatMeasurements).toHaveBeenCalledWith(fatOnlyMeasurements);
    });
  });
});
