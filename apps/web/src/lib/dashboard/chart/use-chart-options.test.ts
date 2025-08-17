import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useChartOptions } from "./use-chart-options";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { LocalDate } from "@js-joda/core";

// Mock dependencies
vi.mock("@/lib/hooks/use-media-query");
vi.mock("./data-transformers");
vi.mock("./option-builders");
vi.mock("./options-template", () => ({
  default: () => ({
    chart: { height: "56%" },
    series: [],
    xAxis: {},
    yAxis: {},
  }),
}));

const mockDataPoint = {
  date: LocalDate.of(2024, 1, 15),
  source: "withings",
  actual: 75.5,
  trend: 75.2,
  isInterpolated: false,
};

const mockDashboardData: DashboardData = {
  dataPoints: [mockDataPoint, { ...mockDataPoint, date: LocalDate.of(2024, 1, 16), actual: 75.3, trend: 75.15 }],
  mode: ["weight"] as any,
  timeRange: ["4w"] as any,
  activeSlope: -0.05,
  weightSlope: -0.05,
  profile: {
    useMetric: false,
    goalWeight: 70,
  } as any,
  measurements: [] as any,
  deltas: [] as any,
  isMe: true,
};

describe("useChartOptions", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  it("should return chart options", () => {
    const { result } = renderHook(() => useChartOptions(mockDashboardData));

    expect(result.current).toBeDefined();
    expect(result.current.chart).toBeDefined();
    expect(result.current.series).toBeDefined();
    expect(result.current.xAxis).toBeDefined();
    expect(result.current.yAxis).toBeDefined();
  });

  it("should adjust height for mobile", () => {
    vi.mocked(useIsMobile).mockReturnValue(true);

    const { result } = renderHook(() => useChartOptions(mockDashboardData));

    expect(result.current.chart?.height).toBe("75%");
  });

  it("should not adjust height for desktop", () => {
    vi.mocked(useIsMobile).mockReturnValue(false);

    const { result } = renderHook(() => useChartOptions(mockDashboardData));

    expect(result.current.chart?.height).toBe("56%");
  });

  it("should handle 4w time range", () => {
    const { result } = renderHook(() =>
      useChartOptions({
        ...mockDashboardData,
        timeRange: ["4w"] as any,
      }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle 3m time range", () => {
    const { result } = renderHook(() =>
      useChartOptions({
        ...mockDashboardData,
        timeRange: ["3m"] as any,
      }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle long term time ranges", () => {
    const timeRanges = ["6m", "1y", "all"] as const;

    timeRanges.forEach((timeRange) => {
      const { result } = renderHook(() =>
        useChartOptions({
          ...mockDashboardData,
          timeRange: [timeRange] as any,
        }),
      );

      expect(result.current).toBeDefined();
    });
  });

  it("should handle explore time range", () => {
    const { result } = renderHook(() =>
      useChartOptions({
        ...mockDashboardData,
        timeRange: ["explore"] as any,
      }),
    );

    expect(result.current).toBeDefined();
  });

  it("should handle fat mode", () => {
    const { result } = renderHook(() =>
      useChartOptions({
        ...mockDashboardData,
        mode: ["fat"] as any,
      }),
    );

    expect(result.current).toBeDefined();
  });

  it("should memoize result when dependencies don't change", () => {
    const { result, rerender } = renderHook(() => useChartOptions(mockDashboardData));

    const firstResult = result.current;

    rerender();

    const secondResult = result.current;

    expect(firstResult).toBe(secondResult);
  });

  it("should recalculate when data points change", () => {
    const { result, rerender } = renderHook(({ data }) => useChartOptions(data), { initialProps: { data: mockDashboardData } });

    const firstResult = result.current;

    const updatedData = {
      ...mockDashboardData,
      dataPoints: [...mockDashboardData.dataPoints, { ...mockDataPoint, date: LocalDate.of(2024, 1, 17), actual: 75.1, trend: 75.1 }],
    };

    rerender({ data: updatedData });

    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
  });

  it("should recalculate when mode changes", () => {
    const { result, rerender } = renderHook(({ data }) => useChartOptions(data), { initialProps: { data: mockDashboardData } });

    const firstResult = result.current;

    const updatedData = {
      ...mockDashboardData,
      mode: ["fat"] as any,
    };

    rerender({ data: updatedData });

    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
  });

  it("should recalculate when time range changes", () => {
    const { result, rerender } = renderHook(({ data }) => useChartOptions(data), { initialProps: { data: mockDashboardData } });

    const firstResult = result.current;

    const updatedData = {
      ...mockDashboardData,
      timeRange: ["3m"] as any,
    };

    rerender({ data: updatedData });

    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
  });

  it("should recalculate when profile changes", () => {
    const { result, rerender } = renderHook(({ data }) => useChartOptions(data), { initialProps: { data: mockDashboardData } });

    const firstResult = result.current;

    const updatedData = {
      ...mockDashboardData,
      profile: {
        ...mockDashboardData.profile,
        useMetric: true,
      },
    };

    rerender({ data: updatedData });

    const secondResult = result.current;

    expect(firstResult).not.toBe(secondResult);
  });

  it("should handle empty data points", () => {
    const emptyData = {
      ...mockDashboardData,
      dataPoints: [],
    };

    const { result } = renderHook(() => useChartOptions(emptyData));

    expect(result.current).toBeDefined();
  });

  it("should handle missing goal weight", () => {
    const dataWithoutGoal = {
      ...mockDashboardData,
      profile: {
        ...mockDashboardData.profile,
        goalWeight: undefined,
      },
    };

    const { result } = renderHook(() => useChartOptions(dataWithoutGoal));

    expect(result.current).toBeDefined();
  });

  it("should handle xAxis as array", () => {
    vi.unmock("./options-template");
    vi.mock("./options-template", () => ({
      default: () => ({
        chart: { height: "56%" },
        series: [],
        xAxis: [], // Array instead of object
        yAxis: {},
      }),
    }));

    const { result } = renderHook(() => useChartOptions(mockDashboardData));

    expect(result.current).toBeDefined();
  });
});
