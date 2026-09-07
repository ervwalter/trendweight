import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useComputeDashboardData } from "./hooks";
import { useDashboardQueries } from "@/lib/api/queries";
import { useSharingCode } from "@/lib/hooks/use-sharing-code";
import { useSharingSearchParams } from "@/lib/hooks/use-sharing-search-params";

vi.mock("@/lib/api/queries");
vi.mock("@/lib/hooks/use-sharing-code");
vi.mock("@/lib/hooks/use-sharing-search-params");

const profile = {
  firstName: "Jane",
  useMetric: true,
  goalStart: undefined,
  goalWeight: 70,
  plannedPoundsPerWeek: -1,
  dayStartOffset: 0,
  showCalories: false,
};

const measurement = { date: "2026-09-01", source: "manual", actualWeight: 80, trendWeight: 80, weightIsInterpolated: false, fatIsInterpolated: false };

function mockQueries(overrides: Partial<ReturnType<typeof useDashboardQueries>> = {}) {
  vi.mocked(useDashboardQueries).mockReturnValue({
    profile,
    measurementData: [measurement],
    sourceData: undefined,
    providerStatus: {},
    profileError: null,
    isMe: true,
    ...overrides,
  } as any);
}

describe("useComputeDashboardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    vi.mocked(useSharingCode).mockReturnValue(undefined);
    vi.mocked(useSharingSearchParams).mockReturnValue({});
    mockQueries();
  });

  it("defaults to weight mode and the 4-week range", () => {
    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.mode[0]).toBe("weight");
    expect(result.current.timeRange[0]).toBe("4w");
  });

  it("restores the persisted range on the user's own dashboard and persists changes", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("3m"));

    const { result } = renderHook(() => useComputeDashboardData());
    expect(result.current.timeRange[0]).toBe("3m");

    act(() => result.current.timeRange[1]("1y"));

    expect(result.current.timeRange[0]).toBe("1y");
    expect(window.localStorage.getItem("timeRange")).toBe(JSON.stringify("1y"));
  });

  it("lets search params beat the persisted range and does not overwrite it", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("1y"));
    vi.mocked(useSharingSearchParams).mockReturnValue({ range: "3m", mode: "fatpercent" });

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.timeRange[0]).toBe("3m");
    expect(result.current.mode[0]).toBe("fatpercent");
    expect(window.localStorage.getItem("timeRange")).toBe(JSON.stringify("1y"));
  });

  it("rejects a persisted value that is not a known range", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("bogus"));

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.timeRange[0]).toBe("4w");
  });

  it("accepts a persisted explore range on the user's own dashboard", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("explore"));

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.timeRange[0]).toBe("explore");
  });

  it("never shows explore on a shared dashboard", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("explore"));
    vi.mocked(useSharingCode).mockReturnValue("abc123");

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.timeRange[0]).toBe("4w");
  });

  it("does not persist range changes made on a shared dashboard", () => {
    window.localStorage.setItem("timeRange", JSON.stringify("3m"));
    vi.mocked(useSharingCode).mockReturnValue("abc123");

    const { result } = renderHook(() => useComputeDashboardData());
    expect(result.current.timeRange[0]).toBe("4w");

    act(() => result.current.timeRange[1]("1y"));

    expect(result.current.timeRange[0]).toBe("1y");
    expect(window.localStorage.getItem("timeRange")).toBe(JSON.stringify("3m"));
  });

  it("passes the sharing code to the queries", () => {
    vi.mocked(useSharingCode).mockReturnValue("abc123");

    renderHook(() => useComputeDashboardData());

    expect(useDashboardQueries).toHaveBeenCalledWith("abc123");
  });

  it("defaults isMe to true and passes through an explicit false", () => {
    mockQueries({ isMe: undefined });
    const { result, rerender } = renderHook(() => useComputeDashboardData());
    expect(result.current.isMe).toBe(true);

    mockQueries({ isMe: false });
    rerender();
    expect(result.current.isMe).toBe(false);
  });

  it("falls back to an empty profile when none is loaded", () => {
    mockQueries({ profile: null });

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.profile).toMatchObject({ firstName: "", useMetric: false, goalWeight: 0 });
  });

  it("converts measurements and derives data points for the selected mode", () => {
    mockQueries({ profile: { ...profile, useMetric: false } });

    const { result } = renderHook(() => useComputeDashboardData());

    expect(result.current.measurements).toHaveLength(1);
    expect(result.current.measurements[0].actualWeight).toBeCloseTo(176.37, 2);
    expect(result.current.dataPoints).toHaveLength(1);
    expect(result.current.dataPoints[0].actual).toBeCloseTo(176.37, 2);

    act(() => result.current.mode[1]("fatpercent"));

    expect(result.current.mode[0]).toBe("fatpercent");
    expect(result.current.dataPoints).toHaveLength(0);
  });
});
