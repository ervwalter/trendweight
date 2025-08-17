import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import Currently from "./currently";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";

// Mock the dashboard hooks
vi.mock("@/lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

import { useDashboardData } from "@/lib/dashboard/hooks";

const mockUseDashboardData = vi.mocked(useDashboardData);

describe("Currently", () => {
  const createDataPoint = (date: string, trend: number) => ({
    date: LocalDate.parse(date),
    source: "test",
    actual: trend,
    trend,
    isInterpolated: false,
  });

  const defaultMockData: Partial<DashboardData> = {
    dataPoints: [],
    mode: ["weight", () => {}],
    profile: {
      useMetric: false,
      plannedPoundsPerWeek: null,
      goalWeight: null,
      goalStart: null,
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no data points", () => {
    mockUseDashboardData.mockReturnValue(defaultMockData as any);

    const { container } = render(<Currently />);
    expect(container.firstChild).toBeNull();
  });

  it("displays current weight with trend", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-01-08", 178)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("Current Weight")).toBeInTheDocument();
    expect(screen.getByText("178.0 lb")).toBeInTheDocument();
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
    expect(screen.getByText(/as of/)).toBeInTheDocument();
  });

  it("displays body fat percentage", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["fatpercent"],
      dataPoints: [createDataPoint("2024-01-01", 0.255), createDataPoint("2024-01-08", 0.248)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("Current Fat %")).toBeInTheDocument();
    expect(screen.getByText("24.8%")).toBeInTheDocument();
    expect(screen.getByText("-0.7%")).toBeInTheDocument();
  });

  it("displays fat mass", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["fatmass"],
      dataPoints: [createDataPoint("2024-01-01", 45), createDataPoint("2024-01-08", 43)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("Current Fat Mass")).toBeInTheDocument();
    expect(screen.getByText("43.0 lb")).toBeInTheDocument();
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
  });

  it("displays lean mass", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["leanmass"],
      dataPoints: [createDataPoint("2024-01-01", 135), createDataPoint("2024-01-08", 136)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("Current Lean Mass")).toBeInTheDocument();
    expect(screen.getByText("136.0 lb")).toBeInTheDocument();
    expect(screen.getByText("+1.0 lb")).toBeInTheDocument();
  });

  it("uses metric units when enabled", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        ...defaultMockData.profile,
        useMetric: true,
      } as any,
      dataPoints: [createDataPoint("2024-01-01", 81.6), createDataPoint("2024-01-08", 80.7)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("80.7 kg")).toBeInTheDocument();
    expect(screen.getByText("-0.9 kg")).toBeInTheDocument();
  });

  it("uses goal start date when available", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        ...defaultMockData.profile,
        goalStart: "2024-01-05",
      } as any,
      dataPoints: [
        createDataPoint("2024-01-01", 180),
        createDataPoint("2024-01-04", 179),
        createDataPoint("2024-01-05", 178.5),
        createDataPoint("2024-01-08", 178),
      ],
    } as any);

    render(<Currently />);

    // Should use Jan 5 as the start point, not Jan 1
    expect(screen.getByText("-0.5 lb")).toBeInTheDocument(); // 178 - 178.5
    expect(screen.getByText(/since/)).toBeInTheDocument();
  });

  it("handles goal start date edge case", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        ...defaultMockData.profile,
        goalStart: "2024-01-10", // Goal start is after all data points
      } as any,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-01-08", 178)],
    } as any);

    render(<Currently />);

    // Should use the first data point since no data after goal start
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
  });

  it("calculates intended direction based on planned rate", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        ...defaultMockData.profile,
        plannedPoundsPerWeek: -1,
      } as any,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-01-08", 178)],
    } as any);

    render(<Currently />);

    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
  });

  it("calculates intended direction based on goal weight", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        ...defaultMockData.profile,
        goalWeight: 170,
      } as any,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-01-08", 178)],
    } as any);

    render(<Currently />);

    // Goal is 170, starting at 180, so intended direction is negative
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
  });

  it("formats dates correctly", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-12-25", 178)],
    } as any);

    render(<Currently />);

    expect(screen.getByText(/as of/)).toBeInTheDocument();
  });

  it("has correct styling classes", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      dataPoints: [createDataPoint("2024-01-01", 180), createDataPoint("2024-01-08", 178)],
    } as any);

    const { container } = render(<Currently />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass("flex", "flex-col", "pb-0", "md:pb-12");

    const title = screen.getByText("Current Weight");
    expect(title).toHaveClass("text-lg", "font-light");

    const value = screen.getByText("178.0 lb");
    expect(value).toHaveClass("text-4xl", "font-medium", "md:text-5xl");
  });
});
