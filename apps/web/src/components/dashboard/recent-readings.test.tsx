import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Mode } from "@/lib/core/interfaces";
import { buildDataPoint, buildProfileData, dailyDataPoints } from "@/test/fixtures";
import { renderWithDashboardData } from "@/test/render";
import RecentReadings from "./recent-readings";

// Three consecutive days, Mon Jan 1 to Wed Jan 3 2024, as buildDataPoint(date, trend, actual)
const threeDays = [buildDataPoint("2024-01-01", 181.0, 180.5), buildDataPoint("2024-01-02", 180.8, 180.2), buildDataPoint("2024-01-03", 180.6, 179.8)];

const imperial = buildProfileData({ useMetric: false, trendAlgorithm: undefined });

const modeOf = (mode: Mode): [Mode, (mode: Mode) => void] => [mode, () => {}];

const headerTexts = () => screen.getAllByRole("columnheader").map((cell) => cell.textContent);

// Each body row's cell texts, in column order
const bodyRows = () => {
  const [, body] = within(screen.getByRole("table")).getAllByRole("rowgroup");
  return within(body)
    .queryAllByRole("row")
    .map((row) =>
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    );
};

describe("RecentReadings", () => {
  it("lists the readings newest first with the actual and trend values under their headers", () => {
    renderWithDashboardData(<RecentReadings />, { dataPoints: threeDays, profile: imperial });

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Recent Weight Readings");
    expect(headerTexts()).toEqual(["Date", "Actual", "Trend"]);
    expect(bodyRows()).toEqual([
      ["Wed, Jan 3", "179.8", "180.6"],
      ["Tue, Jan 2", "180.2", "180.8"],
      ["Mon, Jan 1", "180.5", "181.0"],
    ]);
  });

  it("labels the trend column for an alternate trend algorithm", () => {
    renderWithDashboardData(<RecentReadings />, { dataPoints: threeDays, profile: buildProfileData({ useMetric: false, trendAlgorithm: "holt" }) });

    expect(headerTexts()).toEqual(["Date", "Actual", "Trend (Holt)"]);
  });

  it("shows fat percent readings as unitless percentages", () => {
    renderWithDashboardData(<RecentReadings />, {
      mode: modeOf("fatpercent"),
      dataPoints: [buildDataPoint("2024-01-01", 0.251, 0.255)],
      profile: imperial,
    });

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Recent Fat % Readings");
    expect(bodyRows()).toEqual([["Mon, Jan 1", "25.5", "25.1"]]);
  });

  it("shows metric readings to one decimal place without units", () => {
    renderWithDashboardData(<RecentReadings />, {
      dataPoints: [buildDataPoint("2024-01-01", 82.04, 81.96)],
      profile: buildProfileData({ useMetric: true }),
    });

    expect(bodyRows()).toEqual([["Mon, Jan 1", "82.0", "82.0"]]);
  });

  it("shows only the last 14 readings", () => {
    // Trends 180..199 from Jan 1 to Jan 20; the table keeps Jan 7..Jan 20
    const twentyDays = dailyDataPoints(
      "2024-01-01",
      Array.from({ length: 20 }, (_, i) => 180 + i),
    );

    renderWithDashboardData(<RecentReadings />, { dataPoints: twentyDays, profile: imperial });

    const rows = bodyRows();
    expect(rows).toHaveLength(14);
    expect(rows[0]).toEqual(["Sat, Jan 20", "199.0", "199.0"]);
    expect(rows[13]).toEqual(["Sun, Jan 7", "186.0", "186.0"]);
  });

  it("renders only the header row without data points", () => {
    renderWithDashboardData(<RecentReadings />, { dataPoints: [], profile: imperial });

    expect(headerTexts()).toEqual(["Date", "Actual", "Trend"]);
    expect(bodyRows()).toEqual([]);
  });
});
