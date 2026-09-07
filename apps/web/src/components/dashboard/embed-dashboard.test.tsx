import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Mode, TimeRange } from "@/lib/core/interfaces";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { useDashboardData } from "@/lib/dashboard/hooks";
import { buildDashboardData, buildDataPoint, buildProfileData } from "@/test/fixtures";
import { EmbedDashboard } from "./embed-dashboard";

// Highcharts does not render in jsdom; the stand-in proves the chart sees the embed's data
vi.mock("./chart/chart", () => ({
  default: function ChartStandIn() {
    const { dataPoints } = useDashboardData();
    return <div data-testid="chart">{dataPoints.length} points</div>;
  },
}));

const modeOf = (mode: Mode): [Mode, (mode: Mode) => void] => [mode, () => {}];
const rangeOf = (range: TimeRange): [TimeRange, (range: TimeRange) => void] => [range, () => {}];

// Trend 150 -> 149 lb
const embedData = (overrides: Partial<DashboardData> = {}) =>
  buildDashboardData({
    dataPoints: [buildDataPoint("2024-01-01", 150, 152), buildDataPoint("2024-01-08", 149, 148)],
    profile: buildProfileData({ firstName: "John", useMetric: false }),
    timeRange: rangeOf("4w"),
    ...overrides,
  });

const title = () => screen.getByText(/^(Weight|Fat %|Fat Mass|Lean Mass),/);

describe("EmbedDashboard", () => {
  it("shows the mode, the range and the latest trend value above the chart", () => {
    render(<EmbedDashboard dashboardData={embedData()} />);

    expect(title()).toHaveTextContent(/^Weight, Past 4 weeks$/);
    expect(screen.getByText("Current:")).toHaveTextContent(/^Current: 149\.0 lb$/);
    expect(screen.getByTestId("chart")).toHaveTextContent("2 points");
  });

  it.each([
    ["3m", "Weight, Past 3 months"],
    ["6m", "Weight, Past 6 months"],
    ["1y", "Weight, Past 1 year"],
    ["all", "Weight, All Time"],
    ["explore", "Weight, Explore"],
  ] as [TimeRange, string][])("describes the %s range as %j", (range, expected) => {
    render(<EmbedDashboard dashboardData={embedData({ timeRange: rangeOf(range) })} />);

    expect(title()).toHaveTextContent(new RegExp(`^${expected}$`));
  });

  it("formats the current value for the mode and unit", () => {
    render(
      <EmbedDashboard
        dashboardData={embedData({
          mode: modeOf("fatpercent"),
          dataPoints: [buildDataPoint("2024-01-01", 0.26), buildDataPoint("2024-01-08", 0.248)],
        })}
      />,
    );

    expect(title()).toHaveTextContent(/^Fat %, Past 4 weeks$/);
    expect(screen.getByText("Current:")).toHaveTextContent(/^Current: 24\.8%$/);
  });

  it("uses kilograms for metric profiles", () => {
    render(<EmbedDashboard dashboardData={embedData({ profile: buildProfileData({ firstName: "John", useMetric: true }) })} />);

    expect(screen.getByText("Current:")).toHaveTextContent(/^Current: 149\.0 kg$/);
  });

  it("names the owner when viewing someone else's data", () => {
    render(<EmbedDashboard dashboardData={embedData({ isMe: false })} />);

    expect(title()).toHaveTextContent(/^Weight, Past 4 weeks for John$/);
  });

  it("shows a message instead of the chart without data points", () => {
    render(<EmbedDashboard dashboardData={embedData({ dataPoints: [] })} />);

    expect(screen.getByText("No data available")).toBeInTheDocument();
    expect(screen.queryByText("Current:")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
  });
});
