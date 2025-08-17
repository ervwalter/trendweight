import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import { useScaleReadingsData } from "./use-scale-readings-data";
import { useDownloadData, useProfile } from "@/lib/api/queries";
// Mock dependencies
vi.mock("@/lib/api/queries");
vi.mock("@/components/dashboard/sync-progress/hooks", () => ({
  useSyncProgress: () => ({
    progressId: "test-progress-id",
    progress: null,
    startProgress: vi.fn(),
    endProgress: vi.fn(),
  }),
}));

describe("useScaleReadingsData", () => {
  const mockApiData = {
    sourceData: [
      {
        source: "withings",
        lastUpdate: "2024-01-16T10:00:00Z",
        measurements: [
          {
            date: "2024-01-15",
            time: "08:30:00",
            weight: 75.5,
            fatRatio: 0.225,
          },
          {
            date: "2024-01-16",
            time: "08:00:00",
            weight: 75.3,
            fatRatio: 0.223,
          },
          {
            date: "2024-01-15",
            time: "14:00:00",
            weight: 75.7,
            fatRatio: null,
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
            weight: 75.6,
            fatRatio: null,
          },
        ],
      },
    ],
  };

  beforeEach(() => {
    vi.mocked(useDownloadData).mockReturnValue({
      computedMeasurements: [
        {
          date: "2024-01-15",
          actualWeight: 75.5,
          trendWeight: 75.2,
          actualFatPercent: 22.5,
          trendFatPercent: 22.3,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
        {
          date: "2024-01-16",
          actualWeight: 75.3,
          trendWeight: 75.25,
          actualFatPercent: null,
          trendFatPercent: null,
          weightIsInterpolated: true,
          fatIsInterpolated: false,
        },
        {
          date: "2024-01-14",
          actualWeight: 75.8,
          trendWeight: 75.4,
          actualFatPercent: 22.5,
          trendFatPercent: 22.3,
          weightIsInterpolated: false,
          fatIsInterpolated: false,
        },
      ],
      sourceData: mockApiData.sourceData,
      providerStatus: {},
      isMe: true,
    } as any);
    vi.mocked(useProfile).mockReturnValue({
      data: {
        firstName: "Test User",
        useMetric: true,
        goalStart: null,
        goalWeight: null,
        plannedPoundsPerWeek: null,
        dayStartOffset: 0,
        showCalories: false,
        hideDataBeforeStart: false,
        sharingToken: null,
        sharingEnabled: false,
        isMigrated: true,
        isNewlyMigrated: false,
      },
    } as any);
  });

  describe("computed view", () => {
    it("should return computed measurements sorted oldest first by default", () => {
      const { result } = renderHook(() => useScaleReadingsData("computed", false));

      expect(result.current.readings).toHaveLength(3);
      expect(result.current.readings[0]).toEqual({
        date: LocalDate.of(2024, 1, 14),
        weight: 75.8,
        trend: 75.4,
        fatRatio: 22.5,
        fatTrend: 22.3,
        weightIsInterpolated: false,
        fatIsInterpolated: false,
      });
      expect(result.current.readings[1].date).toEqual(LocalDate.of(2024, 1, 15));
      expect(result.current.readings[2].date).toEqual(LocalDate.of(2024, 1, 16));
    });

    it("should return computed measurements sorted newest first when specified", () => {
      const { result } = renderHook(() => useScaleReadingsData("computed", true));

      expect(result.current.readings).toHaveLength(3);
      expect(result.current.readings[0].date).toEqual(LocalDate.of(2024, 1, 16));
      expect(result.current.readings[1].date).toEqual(LocalDate.of(2024, 1, 15));
      expect(result.current.readings[2].date).toEqual(LocalDate.of(2024, 1, 14));
    });

    it("should include interpolation flags", () => {
      const { result } = renderHook(() => useScaleReadingsData("computed", false));

      const interpolatedReading = result.current.readings.find((r) => r.date.equals(LocalDate.of(2024, 1, 16)));
      expect(interpolatedReading?.weightIsInterpolated).toBe(true);
    });

    it("should return profile data", () => {
      const { result } = renderHook(() => useScaleReadingsData("computed", false));

      expect(result.current.profile).toEqual({
        firstName: "Test User",
        useMetric: true,
        goalStart: null,
        goalWeight: null,
        plannedPoundsPerWeek: null,
        dayStartOffset: 0,
        showCalories: false,
        hideDataBeforeStart: false,
        sharingToken: null,
        sharingEnabled: false,
        isMigrated: true,
        isNewlyMigrated: false,
      });
    });
  });

  describe("provider view", () => {
    it("should return withings measurements sorted by date and time", () => {
      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toHaveLength(3);

      // First should be morning measurement on Jan 15
      expect(result.current.readings[0]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "08:30:00",
        weight: 75.5,
        fatRatio: 0.225,
        provider: "withings",
      });

      // Second should be afternoon measurement on Jan 15
      expect(result.current.readings[1]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "14:00:00",
        weight: 75.7,
        fatRatio: null,
        provider: "withings",
      });

      // Third should be Jan 16
      expect(result.current.readings[2].date).toEqual(LocalDate.of(2024, 1, 16));
    });

    it("should handle sorting newest first with time consideration", () => {
      const { result } = renderHook(() => useScaleReadingsData("withings", true));

      expect(result.current.readings).toHaveLength(3);

      // First should be Jan 16
      expect(result.current.readings[0].date).toEqual(LocalDate.of(2024, 1, 16));

      // Second should be afternoon measurement on Jan 15
      expect(result.current.readings[1]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "14:00:00",
        weight: 75.7,
        fatRatio: null,
        provider: "withings",
      });

      // Third should be morning measurement on Jan 15
      expect(result.current.readings[2]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "08:30:00",
        weight: 75.5,
        fatRatio: 0.225,
        provider: "withings",
      });
    });

    it("should return fitbit measurements", () => {
      const { result } = renderHook(() => useScaleReadingsData("fitbit", false));

      expect(result.current.readings).toHaveLength(1);
      expect(result.current.readings[0]).toEqual({
        date: LocalDate.of(2024, 1, 15),
        time: "09:00:00",
        weight: 75.6,
        fatRatio: null,
        provider: "fitbit",
      });
    });

    it("should return empty array for unknown provider", () => {
      const { result } = renderHook(() => useScaleReadingsData("unknown", false));

      expect(result.current.readings).toEqual([]);
    });

    it("should handle undefined weight as undefined", () => {
      const dataWithNullWeight = {
        sourceData: [
          {
            source: "withings",
            lastUpdate: "2024-01-15T10:00:00Z",
            measurements: [
              {
                date: "2024-01-15",
                time: "08:30:00",
                weight: null,
                fatRatio: 0.225,
              },
            ],
          },
        ],
      };

      vi.mocked(useDownloadData).mockReturnValue(dataWithNullWeight as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toHaveLength(1);
      expect(result.current.readings[0].weight).toBeUndefined();
    });
  });

  describe("sorting edge cases", () => {
    it("should handle readings without time fields", () => {
      const dataWithoutTime = {
        sourceData: [
          {
            source: "manual",
            lastUpdate: "2024-01-16T12:00:00Z",
            measurements: [
              {
                date: "2024-01-15",
                weight: 75.5,
                fatRatio: null,
              },
              {
                date: "2024-01-16",
                weight: 75.3,
                fatRatio: null,
              },
            ],
          },
        ],
      };

      vi.mocked(useDownloadData).mockReturnValue(dataWithoutTime as any);

      const { result } = renderHook(() => useScaleReadingsData("manual", false));

      expect(result.current.readings).toHaveLength(2);
      expect(result.current.readings[0].date).toEqual(LocalDate.of(2024, 1, 15));
      expect(result.current.readings[1].date).toEqual(LocalDate.of(2024, 1, 16));
    });

    it("should be stable when sort order changes", () => {
      const { result, rerender } = renderHook(({ sortNewestFirst }) => useScaleReadingsData("computed", sortNewestFirst), {
        initialProps: { sortNewestFirst: false },
      });

      const initialReadings = result.current.readings;

      rerender({ sortNewestFirst: true });

      const reversedReadings = result.current.readings;

      expect(reversedReadings).toHaveLength(initialReadings.length);
      expect(reversedReadings[0]).toEqual(initialReadings[initialReadings.length - 1]);
      expect(reversedReadings[reversedReadings.length - 1]).toEqual(initialReadings[0]);
    });
  });

  describe("empty data handling", () => {
    it("should handle empty dashboard measurements", () => {
      vi.mocked(useDownloadData).mockReturnValue({
        computedMeasurements: [],
        sourceData: [],
        providerStatus: {},
        isMe: true,
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("computed", false));

      expect(result.current.readings).toEqual([]);
      expect(result.current.profile).toBeDefined();
    });

    it("should handle missing provider data", () => {
      vi.mocked(useDownloadData).mockReturnValue({
        sourceData: [],
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toEqual([]);
    });

    it("should handle provider with empty measurements", () => {
      vi.mocked(useDownloadData).mockReturnValue({
        sourceData: [
          {
            source: "withings",
            lastUpdate: "2024-01-15T10:00:00Z",
            measurements: [],
          },
        ],
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toEqual([]);
    });
  });
});
