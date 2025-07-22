import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import { useScaleReadingsData } from "./useScaleReadingsData";
import { useDashboardQueries } from "../api/queries";
import { useComputeDashboardData } from "../dashboard/hooks";

// Mock dependencies
vi.mock("../api/queries");
vi.mock("../dashboard/hooks");

describe("useScaleReadingsData", () => {
  const mockMeasurement = {
    date: LocalDate.of(2024, 1, 15),
    actualWeight: 75.5,
    trendWeight: 75.2,
    actualFatPercent: 22.5,
    trendFatPercent: 22.3,
    weightIsInterpolated: false,
    fatIsInterpolated: false,
  };

  const mockApiData = {
    measurementData: [
      {
        source: "withings",
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

  const mockDashboardData = {
    measurements: [
      mockMeasurement,
      {
        ...mockMeasurement,
        date: LocalDate.of(2024, 1, 16),
        actualWeight: 75.3,
        trendWeight: 75.25,
        weightIsInterpolated: true,
      },
      {
        ...mockMeasurement,
        date: LocalDate.of(2024, 1, 14),
        actualWeight: 75.8,
        trendWeight: 75.4,
      },
    ],
    profile: {
      name: "Test User",
      email: "test@example.com",
    },
  };

  beforeEach(() => {
    vi.mocked(useDashboardQueries).mockReturnValue(mockApiData as any);
    vi.mocked(useComputeDashboardData).mockReturnValue(mockDashboardData as any);
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
        name: "Test User",
        email: "test@example.com",
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
        measurementData: [
          {
            source: "withings",
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

      vi.mocked(useDashboardQueries).mockReturnValue(dataWithNullWeight as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toHaveLength(1);
      expect(result.current.readings[0].weight).toBeUndefined();
    });
  });

  describe("sorting edge cases", () => {
    it("should handle readings without time fields", () => {
      const dataWithoutTime = {
        measurementData: [
          {
            source: "manual",
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

      vi.mocked(useDashboardQueries).mockReturnValue(dataWithoutTime as any);

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
      vi.mocked(useComputeDashboardData).mockReturnValue({
        measurements: [],
        profile: mockDashboardData.profile,
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("computed", false));

      expect(result.current.readings).toEqual([]);
      expect(result.current.profile).toBeDefined();
    });

    it("should handle missing provider data", () => {
      vi.mocked(useDashboardQueries).mockReturnValue({
        measurementData: [],
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toEqual([]);
    });

    it("should handle provider with empty measurements", () => {
      vi.mocked(useDashboardQueries).mockReturnValue({
        measurementData: [
          {
            source: "withings",
            measurements: [],
          },
        ],
      } as any);

      const { result } = renderHook(() => useScaleReadingsData("withings", false));

      expect(result.current.readings).toEqual([]);
    });
  });
});
