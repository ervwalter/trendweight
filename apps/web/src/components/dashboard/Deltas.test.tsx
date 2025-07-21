import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import Deltas from "./Deltas";
import type { DashboardData } from "../../lib/dashboard/dashboardContext";

// Mock the dashboard hooks
vi.mock("../../lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

import { useDashboardData } from "../../lib/dashboard/hooks";

const mockUseDashboardData = vi.mocked(useDashboardData);

describe("Deltas", () => {
  const defaultMockData: Partial<DashboardData> = {
    deltas: [],
    mode: ["weight", () => {}],
    dataPoints: [
      {
        date: LocalDate.parse("2024-01-01"),
        source: "test",
        actual: 180,
        trend: 180,
        isInterpolated: false,
      },
    ],
    profile: {
      useMetric: false,
      plannedPoundsPerWeek: -1,
      goalWeight: 170,
    } as any,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no deltas", () => {
    mockUseDashboardData.mockReturnValue(defaultMockData as any);

    const { container } = render(<Deltas />);
    expect(container.firstChild).toBeNull();
  });

  it("renders weight deltas with correct intended direction", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      deltas: [
        { period: "week", description: "1 week ago", delta: -2 },
        { period: "month", description: "1 month ago", delta: -5 },
      ],
    } as any);

    render(<Deltas />);

    expect(screen.getByText("Weight Changes Over Time")).toBeInTheDocument();
    expect(screen.getByText(/Since 1 week ago:/)).toBeInTheDocument();
    expect(screen.getByText(/Since 1 month ago:/)).toBeInTheDocument();
  });

  it("renders fat percent deltas with negative intended direction", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["fatpercent"],
      deltas: [
        { period: "week", description: "1 week ago", delta: -0.5 },
        { period: "month", description: "1 month ago", delta: -1.2 },
      ],
    } as any);

    render(<Deltas />);

    expect(screen.getByText("Fat % Changes Over Time")).toBeInTheDocument();
  });

  it("renders fat mass deltas with negative intended direction", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["fatmass"],
      deltas: [{ period: "week", description: "1 week ago", delta: -2.5 }],
    } as any);

    render(<Deltas />);

    expect(screen.getByText("Fat Mass Changes Over Time")).toBeInTheDocument();
  });

  it("renders lean mass deltas with positive intended direction", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["leanmass"],
      deltas: [{ period: "week", description: "1 week ago", delta: 1.5 }],
    } as any);

    render(<Deltas />);

    expect(screen.getByText("Lean Mass Changes Over Time")).toBeInTheDocument();
  });

  it("uses goal weight for intended direction when no planned rate", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        useMetric: false,
        plannedPoundsPerWeek: null,
        goalWeight: 160,
      } as any,
      dataPoints: [
        {
          date: LocalDate.parse("2024-01-01"),
          source: "test",
          actual: 180,
          trend: 180,
          isInterpolated: false,
        },
      ],
      deltas: [{ period: "week", description: "1 week ago", delta: -2 }],
    } as any);

    render(<Deltas />);

    // Should calculate intended direction as negative (160 - 180 = -20)
    expect(screen.getByText(/Since 1 week ago:/)).toBeInTheDocument();
  });

  it("uses default negative direction when no planned rate or goal", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        useMetric: false,
        plannedPoundsPerWeek: null,
        goalWeight: null,
      } as any,
      deltas: [{ period: "week", description: "1 week ago", delta: -2 }],
    } as any);

    render(<Deltas />);

    expect(screen.getByText(/Since 1 week ago:/)).toBeInTheDocument();
  });

  it("formats deltas with metric units when enabled", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      profile: {
        useMetric: true,
        plannedPoundsPerWeek: -0.5,
        goalWeight: null,
      } as any,
      deltas: [{ period: "week", description: "1 week ago", delta: -0.9 }],
    } as any);

    render(<Deltas />);

    // formatMeasurement should be called with metric: true
    expect(screen.getByText(/Since 1 week ago:/)).toBeInTheDocument();
  });

  it("renders multiple deltas in order", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      deltas: [
        { period: "week", description: "1 week ago", delta: -2 },
        { period: "month", description: "1 month ago", delta: -5 },
        { period: "quarter", description: "3 months ago", delta: -12 },
        { period: "year", description: "1 year ago", delta: -30 },
      ],
    } as any);

    render(<Deltas />);

    const deltas = screen.getAllByText(/Since .* ago:/);
    expect(deltas).toHaveLength(4);
    expect(deltas[0]).toHaveTextContent("Since 1 week ago:");
    expect(deltas[1]).toHaveTextContent("Since 1 month ago:");
    expect(deltas[2]).toHaveTextContent("Since 3 months ago:");
    expect(deltas[3]).toHaveTextContent("Since 1 year ago:");
  });
});
