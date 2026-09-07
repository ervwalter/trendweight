import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Mode, ProfileData } from "@/lib/core/interfaces";
import { buildDataPoint, buildProfileData } from "@/test/fixtures";
import { renderWithDashboardData } from "@/test/render";
import Currently from "./currently";

const imperial = (overrides: Partial<ProfileData> = {}) =>
  buildProfileData({ useMetric: false, plannedPoundsPerWeek: undefined, goalWeight: undefined, goalStart: undefined, ...overrides });

const modeOf = (mode: Mode): [Mode, (mode: Mode) => void] => [mode, () => {}];

// 180 -> 178 over one week
const oneWeek = [buildDataPoint("2024-01-01", 180), buildDataPoint("2024-01-08", 178)];

describe("Currently", () => {
  it("renders nothing without data points", () => {
    const { container } = renderWithDashboardData(<Currently />, { dataPoints: [], profile: imperial() });

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the latest trend, the change since the first point and the latest date", () => {
    renderWithDashboardData(<Currently />, { dataPoints: oneWeek, profile: imperial() });

    expect(screen.getByText("Current Weight")).toBeInTheDocument();
    expect(screen.getByText("178.0 lb")).toBeInTheDocument();
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
    expect(screen.getByText("as of Jan 8, 2024")).toBeInTheDocument();
  });

  it("formats metric values in kilograms", () => {
    renderWithDashboardData(<Currently />, {
      dataPoints: [buildDataPoint("2024-01-01", 81.6), buildDataPoint("2024-01-08", 80.7)],
      profile: imperial({ useMetric: true }),
    });

    expect(screen.getByText("80.7 kg")).toBeInTheDocument();
    expect(screen.getByText("-0.9 kg")).toBeInTheDocument();
  });

  it("measures the change from the first point on or after the goal start", () => {
    renderWithDashboardData(<Currently />, {
      dataPoints: [
        buildDataPoint("2024-01-01", 180),
        buildDataPoint("2024-01-04", 179),
        buildDataPoint("2024-01-05", 178.5),
        buildDataPoint("2024-01-08", 178),
      ],
      profile: imperial({ goalStart: "2024-01-05" }),
    });

    // 178 - 178.5, not 178 - 180
    expect(screen.getByText("-0.5 lb")).toBeInTheDocument();
    expect(screen.getByText("since Jan 5, 2024")).toBeInTheDocument();
  });

  it("falls back to the first point when the goal start is after every data point", () => {
    renderWithDashboardData(<Currently />, { dataPoints: oneWeek, profile: imperial({ goalStart: "2024-01-10" }) });

    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
    expect(screen.getByText("since Jan 10, 2024")).toBeInTheDocument();
  });

  describe("change direction", () => {
    it("treats a loss as positive under a losing plan", () => {
      renderWithDashboardData(<Currently />, { dataPoints: oneWeek, profile: imperial({ plannedPoundsPerWeek: -1 }) });

      expect(screen.getByLabelText("Positive change")).toHaveTextContent("↓");
    });

    it("treats a loss as negative when there is no plan and the goal is above the starting trend", () => {
      renderWithDashboardData(<Currently />, { dataPoints: oneWeek, profile: imperial({ goalWeight: 190 }) });

      expect(screen.getByLabelText("Negative change")).toHaveTextContent("↓");
    });

    it("treats a loss as positive when there is no plan and the goal is below the starting trend", () => {
      renderWithDashboardData(<Currently />, { dataPoints: oneWeek, profile: imperial({ goalWeight: 170 }) });

      expect(screen.getByLabelText("Positive change")).toHaveTextContent("↓");
    });

    it("assumes losing is the goal without a plan or goal weight", () => {
      renderWithDashboardData(<Currently />, {
        dataPoints: [buildDataPoint("2024-01-01", 178), buildDataPoint("2024-01-08", 180)],
        profile: imperial(),
      });

      expect(screen.getByText("+2.0 lb")).toBeInTheDocument();
      expect(screen.getByLabelText("Negative change")).toHaveTextContent("↑");
    });

    it("treats a lean mass gain as positive", () => {
      renderWithDashboardData(<Currently />, {
        mode: modeOf("leanmass"),
        dataPoints: [buildDataPoint("2024-01-01", 135), buildDataPoint("2024-01-08", 136)],
        profile: imperial(),
      });

      expect(screen.getByText("Current Lean Mass")).toBeInTheDocument();
      expect(screen.getByText("136.0 lb")).toBeInTheDocument();
      expect(screen.getByText("+1.0 lb")).toBeInTheDocument();
      expect(screen.getByLabelText("Positive change")).toHaveTextContent("↑");
    });

    it("renders no arrow when nothing has changed", () => {
      renderWithDashboardData(<Currently />, {
        dataPoints: [buildDataPoint("2024-01-01", 180), buildDataPoint("2024-01-08", 180)],
        profile: imperial(),
      });

      expect(screen.getByText("0.0 lb")).toBeInTheDocument();
      expect(screen.queryByLabelText(/change/)).not.toBeInTheDocument();
    });
  });

  it("formats fat percent as a percentage and treats a drop as positive", () => {
    renderWithDashboardData(<Currently />, {
      mode: modeOf("fatpercent"),
      dataPoints: [buildDataPoint("2024-01-01", 0.257), buildDataPoint("2024-01-08", 0.25)],
      profile: imperial(),
    });

    expect(screen.getByText("Current Fat %")).toBeInTheDocument();
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("-0.7%")).toBeInTheDocument();
    expect(screen.getByLabelText("Positive change")).toHaveTextContent("↓");
  });

  it("formats fat mass in the profile's weight unit", () => {
    renderWithDashboardData(<Currently />, {
      mode: modeOf("fatmass"),
      dataPoints: [buildDataPoint("2024-01-01", 45), buildDataPoint("2024-01-08", 43)],
      profile: imperial(),
    });

    expect(screen.getByText("Current Fat Mass")).toBeInTheDocument();
    expect(screen.getByText("43.0 lb")).toBeInTheDocument();
    expect(screen.getByText("-2.0 lb")).toBeInTheDocument();
  });
});
