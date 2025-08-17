import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmbedDashboard } from "./embed-dashboard";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";

// Mock the Chart component
vi.mock("./chart/chart", () => ({
  default: () => <div data-testid="chart">Chart Component</div>,
}));

// Mock the DashboardProvider
vi.mock("@/lib/dashboard/context", () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-provider">{children}</div>,
}));

// Mock formatMeasurement function
vi.mock("@/lib/core/numbers", () => ({
  formatMeasurement: vi.fn((value, options) => {
    if (options.type === "weight") {
      return options.metric ? `${value} kg` : `${value} lbs`;
    }
    return `${value}%`;
  }),
}));

describe("EmbedDashboard", () => {
  const mockDashboardData: DashboardData = {
    mode: ["weight", vi.fn()],
    timeRange: ["4w", vi.fn()],
    profile: {
      firstName: "John",
      useMetric: false,
    } as any,
    dataPoints: [
      {
        date: {} as any, // Mock LocalDate
        source: "test",
        trend: 150,
        actual: 152,
        isInterpolated: false,
      },
      {
        date: {} as any, // Mock LocalDate
        source: "test",
        trend: 149,
        actual: 148,
        isInterpolated: false,
      },
    ],
    measurements: [], // Add missing property
    weightSlope: 0, // Add missing property
    activeSlope: 0, // Add missing property
    deltas: [], // Add missing property
    isMe: true,
  } as DashboardData;

  it("renders the dashboard with title and current weight", () => {
    render(<EmbedDashboard dashboardData={mockDashboardData} />);

    expect(
      screen.getByText((_content, element) => {
        return (
          (element?.className?.includes("font-medium") && element?.textContent?.includes("Weight") && element?.textContent?.includes("Past 4 weeks")) || false
        );
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Current:")).toBeInTheDocument();
    expect(screen.getByText("149 lbs")).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
  });

  it("displays correct mode and time range in title", () => {
    const data = {
      ...mockDashboardData,
      mode: ["fatpercent", vi.fn()],
      timeRange: ["3m", vi.fn()],
    } as DashboardData;

    render(<EmbedDashboard dashboardData={data} />);

    expect(
      screen.getByText((_content, element) => {
        return (
          (element?.className?.includes("font-medium") && element?.textContent?.includes("Fat %") && element?.textContent?.includes("Past 3 months")) || false
        );
      }),
    ).toBeInTheDocument();
  });

  it("shows 'All Time' for all timeRange", () => {
    const data = {
      ...mockDashboardData,
      timeRange: ["all", vi.fn()],
    } as DashboardData;

    render(<EmbedDashboard dashboardData={data} />);

    expect(
      screen.getByText((_content, element) => {
        return (element?.className?.includes("font-medium") && element?.textContent?.includes("Weight") && element?.textContent?.includes("All Time")) || false;
      }),
    ).toBeInTheDocument();
  });

  it("shows 'Explore' for explore timeRange", () => {
    const data = {
      ...mockDashboardData,
      timeRange: ["explore", vi.fn()],
    } as DashboardData;

    render(<EmbedDashboard dashboardData={data} />);

    expect(
      screen.getByText((_content, element) => {
        return (element?.className?.includes("font-medium") && element?.textContent?.includes("Weight") && element?.textContent?.includes("Explore")) || false;
      }),
    ).toBeInTheDocument();
  });

  it("includes user name when not viewing own data", () => {
    const data = {
      ...mockDashboardData,
      isMe: false,
    };

    render(<EmbedDashboard dashboardData={data} />);

    expect(
      screen.getByText((_content, element) => {
        return (
          (element?.className?.includes("font-medium") &&
            element?.textContent?.includes("Weight") &&
            element?.textContent?.includes("Past 4 weeks") &&
            element?.textContent?.includes("for John")) ||
          false
        );
      }),
    ).toBeInTheDocument();
  });

  it("shows no data message when no data points", () => {
    const data = {
      ...mockDashboardData,
      dataPoints: [],
    };

    render(<EmbedDashboard dashboardData={data} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByText("Current:")).not.toBeInTheDocument();
    // Should not show the title when no data
    expect(
      screen.queryByText((_content, element) => {
        return element?.className?.includes("font-medium") || false;
      }),
    ).not.toBeInTheDocument();
  });

  it("uses metric units when profile.useMetric is true", () => {
    const data = {
      ...mockDashboardData,
      profile: {
        ...mockDashboardData.profile,
        useMetric: true,
      },
    };

    render(<EmbedDashboard dashboardData={data} />);

    expect(screen.getByText("149 kg")).toBeInTheDocument();
  });

  it("handles different modes correctly", () => {
    const modes = [
      ["weight", "Weight"],
      ["fatpercent", "Fat %"],
      ["fatmass", "Fat Mass"],
      ["leanmass", "Lean Mass"],
    ] as const;

    modes.forEach(([mode, expectedLabel]) => {
      const data = {
        ...mockDashboardData,
        mode: [mode, vi.fn()],
      } as DashboardData;

      const { unmount } = render(<EmbedDashboard dashboardData={data} />);

      expect(
        screen.getByText((_content, element) => {
          return (element?.className?.includes("font-medium") && element?.textContent?.includes(expectedLabel)) || false;
        }),
      ).toBeInTheDocument();

      unmount();
    });
  });

  it("wraps content in DashboardProvider", () => {
    render(<EmbedDashboard dashboardData={mockDashboardData} />);

    expect(screen.getByTestId("dashboard-provider")).toBeInTheDocument();
  });

  it("uses flex layout with correct structure", () => {
    const { container } = render(<EmbedDashboard dashboardData={mockDashboardData} />);

    const mainContainer = container.querySelector(".flex.h-full.w-full.flex-col");
    expect(mainContainer).toBeInTheDocument();

    const headerContainer = container.querySelector(".flex.items-baseline.justify-between");
    expect(headerContainer).toBeInTheDocument();

    const chartContainer = container.querySelector(".flex-1");
    expect(chartContainer).toBeInTheDocument();
  });

  it("handles data with single data point", () => {
    const data = {
      ...mockDashboardData,
      dataPoints: [
        {
          date: {} as any, // Mock LocalDate
          source: "test",
          trend: 150,
          actual: 152,
          isInterpolated: false,
        },
      ],
    };

    render(<EmbedDashboard dashboardData={data} />);

    expect(screen.getByText("Current:")).toBeInTheDocument();
    expect(screen.getByText("150 lbs")).toBeInTheDocument();
  });
});
