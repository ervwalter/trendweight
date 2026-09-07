import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { SeriesLineOptions, XAxisOptions, YAxisOptions } from "highcharts";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { buildDashboardData, buildProfileData, dailyDataPoints } from "@/test/fixtures";
import { useChartOptions } from "./use-chart-options";
import chartOptionsTemplate from "./options-template";

vi.mock("@/lib/hooks/use-media-query");

const DAY = 86400000;

// 30 daily points ending 2024-01-15 (a Monday), trend rising 0.1 per day from 80
const dataPoints = dailyDataPoints(
  "2023-12-17",
  Array.from({ length: 30 }, (_, i) => 80 + i * 0.1),
);

function dashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return buildDashboardData({
    dataPoints,
    activeSlope: 0.1,
    profile: buildProfileData({ useMetric: true, goalWeight: 75 }),
    ...overrides,
  });
}

const xAxis = (data: ReturnType<typeof useChartOptions>) => data.xAxis as XAxisOptions;
const yAxis = (data: ReturnType<typeof useChartOptions>) => data.yAxis as YAxisOptions;

describe("useChartOptions", () => {
  beforeEach(() => {
    vi.mocked(useIsMobile).mockReturnValue(false);
  });

  describe("time ranges", () => {
    it("builds the 4-week chart with weekend bands and the six 4-week series", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ timeRange: ["4w", vi.fn()] })));

      expect(result.current.series?.map((s) => s.id)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect(xAxis(result.current).plotBands).toHaveLength(9);
      expect(xAxis(result.current).tickInterval).toBe(7 * DAY);
      expect(xAxis(result.current).range).toBe(33 * DAY);
      expect(result.current.navigator?.enabled).toBe(false);
    });

    it("builds the 3-month chart with a 95-day range and no weekend bands", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ timeRange: ["3m", vi.fn()] })));

      expect(result.current.series?.map((s) => s.id)).toEqual(["trend", "actual", "estimated", "actual-sinkers", "estimated-sinkers", "projection"]);
      expect(xAxis(result.current).range).toBe(95 * DAY);
      expect(xAxis(result.current).plotBands).toEqual([]);
    });

    it.each([
      ["6m", 185 * DAY],
      ["1y", 370 * DAY],
      ["all", (30 - 1 + 6) * DAY],
    ] as const)("builds the %s chart as trend, line and projection with a %i ms range", (timeRange, range) => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ timeRange: [timeRange, vi.fn()] })));

      expect(result.current.series?.map((s) => s.id)).toEqual(["trend", "actual", "projection"]);
      expect(xAxis(result.current).range).toBe(range);
      expect(xAxis(result.current).plotBands).toEqual([]);
    });

    it("builds the explore chart with the navigator enabled and a range handler", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ timeRange: ["explore", vi.fn()] })));

      expect(result.current.navigator?.enabled).toBe(true);
      expect(result.current.legend?.enabled).toBe(false);
      expect(xAxis(result.current).range).toBeUndefined();
      expect(xAxis(result.current).events?.afterSetExtremes).toEqual(expect.any(Function));
    });
  });

  describe("chart data", () => {
    it("feeds the trend series the epoch/trend pairs and names it after the mode and algorithm", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ profile: buildProfileData({ trendAlgorithm: "holt" }) })));

      const trend = result.current.series?.[0] as SeriesLineOptions;
      expect(trend.name).toBe("Weight Trend (Holt)");
      expect(trend.data?.[0]).toEqual([1702771200000, 80]); // 2023-12-17
      expect(trend.data).toHaveLength(30);
    });

    it("projects six days past the last point using the active slope", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData()));

      const projection = result.current.series?.find((s) => s.id === "projection") as SeriesLineOptions;
      const [[startEpoch, start], [endEpoch, end]] = projection.data as [number, number][];
      expect(startEpoch).toBe(1705276800000); // 2024-01-15
      expect(start).toBeCloseTo(82.9, 10);
      expect(endEpoch).toBe(1705795200000); // 2024-01-21
      expect(end).toBeCloseTo(83.5, 10);
    });

    it("scales fat percentage ratios to percentages", () => {
      const fatPoints = dailyDataPoints("2024-01-13", [0.25, 0.125, 0.375]);
      const { result } = renderHook(() => useChartOptions(dashboardData({ dataPoints: fatPoints, mode: ["fatpercent", vi.fn()], activeSlope: 0.001 })));

      const trend = result.current.series?.[0] as SeriesLineOptions;
      expect(trend.name).toBe("Fat % Trend");
      expect((trend.data as [number, number][]).map(([, value]) => value)).toEqual([25, 12.5, 37.5]);
    });
  });

  describe("y axis", () => {
    it("uses the metric minimum range and goal band for a metric weight chart", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData()));

      expect(yAxis(result.current).minRange).toBe(3);
      expect(yAxis(result.current).plotBands?.[0]).toMatchObject({ from: 75 - 1.134, to: 75 + 1.134 });
    });

    it("uses the imperial minimum range and goal band for an imperial weight chart", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ profile: buildProfileData({ useMetric: false, goalWeight: 165 }) })));

      expect(yAxis(result.current).minRange).toBe(5);
      expect(yAxis(result.current).plotBands?.[0]).toMatchObject({ from: 162.5, to: 167.5 });
    });

    it("uses a 5 point minimum range and no goal band for fat percentage", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ mode: ["fatpercent", vi.fn()] })));

      expect(yAxis(result.current).minRange).toBe(5);
      expect(yAxis(result.current).plotBands).toBeUndefined();
    });

    it("adds no goal band without a goal weight", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ profile: buildProfileData({ goalWeight: undefined }) })));

      expect(yAxis(result.current).plotBands).toBeUndefined();
      expect(yAxis(result.current).plotLines).toBeUndefined();
    });
  });

  describe("height", () => {
    it("keeps the template height on desktop", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData()));

      expect(result.current.chart?.height).toBe("56%");
    });

    it("uses a taller aspect ratio on mobile", () => {
      vi.mocked(useIsMobile).mockReturnValue(true);

      const { result } = renderHook(() => useChartOptions(dashboardData()));

      expect(result.current.chart?.height).toBe("75%");
    });

    it("prefers an explicit height override to the mobile height", () => {
      vi.mocked(useIsMobile).mockReturnValue(true);

      const { result } = renderHook(() => useChartOptions(dashboardData(), "400px"));

      expect(result.current.chart?.height).toBe("400px");
    });
  });

  describe("empty data", () => {
    it("returns the bare template with no series when there are no data points", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ dataPoints: [], mode: ["fatpercent", vi.fn()] })));

      const template = chartOptionsTemplate();
      expect(result.current.series).toEqual([]);
      expect(result.current.chart?.height).toBe(template.chart?.height);
      expect(xAxis(result.current).plotBands).toBeUndefined();
      expect(xAxis(result.current).range).toBeUndefined();
      expect(yAxis(result.current).minRange).toBeUndefined();
      expect(result.current.navigator?.enabled).toBe(false);
    });

    it("still applies the height override without data", () => {
      const { result } = renderHook(() => useChartOptions(dashboardData({ dataPoints: [] }), "300px"));

      expect(result.current.chart?.height).toBe("300px");
    });
  });

  describe("memoization", () => {
    it("returns the same options object when nothing changed", () => {
      const data = dashboardData();
      const { result, rerender } = renderHook(() => useChartOptions(data));
      const first = result.current;

      rerender();

      expect(result.current).toBe(first);
    });

    it.each<[string, Partial<DashboardData>]>([
      ["data points", { dataPoints: dataPoints.slice(0, 20) }],
      ["mode", { mode: ["fatmass", vi.fn()] }],
      ["time range", { timeRange: ["3m", vi.fn()] }],
      ["units", { profile: buildProfileData({ useMetric: false }) }],
    ])("rebuilds the options when the %s change", (_label, overrides) => {
      const { result, rerender } = renderHook(({ data }) => useChartOptions(data), { initialProps: { data: dashboardData() } });
      const first = result.current;

      rerender({ data: dashboardData(overrides) });

      expect(result.current).not.toBe(first);
    });
  });
});
