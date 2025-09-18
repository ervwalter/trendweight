import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import Deltas from "./deltas";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";

vi.mock("@/lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

import { useDashboardData } from "@/lib/dashboard/hooks";

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

  const withDeltas = (overrides: Partial<DashboardData> = {}) =>
    ({
      ...defaultMockData,
      deltas: [
        { period: "week", description: "1 week ago", delta: -2 },
        { period: "month", description: "1 month ago", delta: -5 },
      ],
      activeSlope: -0.1,
      ...overrides,
    }) as any;

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
      mode: ["fatpercent", () => {}],
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
      mode: ["fatmass", () => {}],
      deltas: [{ period: "week", description: "1 week ago", delta: -2.5 }],
    } as any);
    render(<Deltas />);
    expect(screen.getByText("Fat Mass Changes Over Time")).toBeInTheDocument();
  });

  it("renders lean mass deltas with positive intended direction", () => {
    mockUseDashboardData.mockReturnValue({
      ...defaultMockData,
      mode: ["leanmass", () => {}],
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

  it("shows weekly rate sentence for weight", () => {
    mockUseDashboardData.mockReturnValue(
      withDeltas({
        mode: ["weight", () => {}],
        isMe: true,
        activeSlope: -0.1,
        profile: { ...(defaultMockData.profile as any), useMetric: false } as any,
      }) as any,
    );
    render(<Deltas />);
    expect(screen.getByText(/You are losing/)).toBeInTheDocument();
    expect(screen.getByText("0.7 lb")).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes("/week")).length).toBeGreaterThan(0);
  });

  it("shows weekly rate sentence for fat percent", () => {
    mockUseDashboardData.mockReturnValue(
      withDeltas({
        mode: ["fatpercent", () => {}],
        isMe: true,
        activeSlope: 0.02,
        profile: { ...(defaultMockData.profile as any), useMetric: false } as any,
      }) as any,
    );
    render(<Deltas />);
    expect(screen.getByText(/You are gaining/)).toBeInTheDocument();
    expect(screen.getByText((_, node) => !!node && node.tagName === "STRONG" && /%$/.test(node.textContent || ""))).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes("/week")).length).toBeGreaterThan(0);
    expect(screen.getByText(/of body fat/)).toBeInTheDocument();
  });

  it("shows weekly rate sentence for fat mass (metric)", () => {
    mockUseDashboardData.mockReturnValue(
      withDeltas({
        mode: ["fatmass", () => {}],
        isMe: true,
        activeSlope: -0.05,
        profile: { ...(defaultMockData.profile as any), useMetric: true } as any,
      }) as any,
    );
    render(<Deltas />);
    expect(screen.getByText(/You are losing/)).toBeInTheDocument();
    expect(screen.getByText((_, node) => !!node && node.tagName === "STRONG" && /kg$/.test(node.textContent || ""))).toBeInTheDocument();
    expect(screen.getAllByText((content) => content.includes("/week")).length).toBeGreaterThan(0);
    expect(screen.getByText(/of fat mass/)).toBeInTheDocument();
  });

  it("shows weekly rate sentence for lean mass (metric)", () => {
    mockUseDashboardData.mockReturnValue(
      withDeltas({
        mode: ["leanmass", () => {}],
        isMe: true,
        activeSlope: 0.03,
        profile: { ...(defaultMockData.profile as any), useMetric: true } as any,
      }) as any,
    );
    render(<Deltas />);
    expect(screen.getByText(/You are gaining/)).toBeInTheDocument();
    expect(screen.getByText(/of lean mass/)).toBeInTheDocument();
  });

  it("uses third-person wording when not viewing own profile", () => {
    mockUseDashboardData.mockReturnValue(
      withDeltas({
        isMe: false,
        activeSlope: -0.1,
        profile: { ...(defaultMockData.profile as any), firstName: "Test", useMetric: false } as any,
      }) as any,
    );
    render(<Deltas />);
    expect(screen.getByText(/Test is losing/)).toBeInTheDocument();
  });
});
