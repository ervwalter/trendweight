import { LocalDate } from "@js-joda/core";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ScaleReadingsDataTable } from "./scale-readings-data-table";
import type { ScaleReading } from "./types";

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

describe("ScaleReadingsDataTable", () => {
  const createMockReadings = (count: number): ScaleReading[] => {
    return Array.from({ length: count }, (_, i) => ({
      date: LocalDate.of(2024, 1, 1).plusDays(i),
      weight: 180 + i * 0.1,
      trend: 180 + i * 0.05,
      fatRatio: 0.25 + i * 0.001,
      fatTrend: 0.25 + i * 0.0005,
    }));
  };

  const defaultProps = {
    readings: createMockReadings(125),
    viewType: "computed",
    useMetric: false,
  };

  it("should render table with correct headers for computed view", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Actual Weight")).toBeInTheDocument();
    expect(screen.getByText("Trend Weight")).toBeInTheDocument();
    expect(screen.getByText("Actual Fat %")).toBeInTheDocument();
    expect(screen.getByText("Trend Fat %")).toBeInTheDocument();
    expect(screen.queryByText("Time")).not.toBeInTheDocument();
  });

  it("should render table with correct headers for provider view", () => {
    render(<ScaleReadingsDataTable {...defaultProps} viewType="fitbit" />);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Body Fat %")).toBeInTheDocument();
    expect(screen.queryByText("Trend Weight")).not.toBeInTheDocument();
    expect(screen.queryByText("Trend Fat %")).not.toBeInTheDocument();
  });

  it("should display pagination controls when more than 50 items", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    // We have top and bottom pagination, so we'll have multiple buttons
    expect(screen.getAllByRole("button", { name: /previous/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /next/i })).toHaveLength(2);
    expect(screen.getAllByText(/page 1 of 3/i)).toHaveLength(2);
    expect(screen.getByText(/125 total readings/i)).toBeInTheDocument();
  });

  it("should not display pagination controls when 50 or fewer items", () => {
    const props = { ...defaultProps, readings: createMockReadings(50) };
    render(<ScaleReadingsDataTable {...props} />);

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByText(/50 total readings/i)).toBeInTheDocument();
  });

  it("should paginate data correctly", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    // Check first page shows 50 items
    const rows = screen.getAllByRole("row");
    // Header row + 50 data rows
    expect(rows).toHaveLength(51);
  });

  it("should handle page navigation", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    // Get the first next button (from top pagination)
    const nextButtons = screen.getAllByRole("button", { name: /next/i });
    fireEvent.click(nextButtons[0]);

    // Should have two "page 2 of 3" texts (top and bottom)
    expect(screen.getAllByText(/page 2 of 3/i)).toHaveLength(2);

    // Get the first previous button
    const prevButtons = screen.getAllByRole("button", { name: /previous/i });
    fireEvent.click(prevButtons[0]);

    expect(screen.getAllByText(/page 1 of 3/i)).toHaveLength(2);
  });

  it("should disable previous button on first page", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    // Both previous buttons should be disabled on first page
    const prevButtons = screen.getAllByRole("button", { name: /previous/i });
    expect(prevButtons[0]).toBeDisabled();
    expect(prevButtons[1]).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    const nextButtons = screen.getAllByRole("button", { name: /next/i });

    // Navigate to last page using first next button
    fireEvent.click(nextButtons[0]);
    fireEvent.click(nextButtons[0]);

    expect(screen.getAllByText(/page 3 of 3/i)).toHaveLength(2);

    // Get fresh references to next buttons after navigation
    const updatedNextButtons = screen.getAllByRole("button", { name: /next/i });
    expect(updatedNextButtons[0]).toBeDisabled();
    expect(updatedNextButtons[1]).toBeDisabled();
  });

  it("should handle first and last page navigation", () => {
    render(<ScaleReadingsDataTable {...defaultProps} />);

    // Go to page 2
    const nextButtons = screen.getAllByRole("button", { name: /next/i });
    fireEvent.click(nextButtons[0]);
    expect(screen.getAllByText(/page 2 of 3/i)).toHaveLength(2);

    // Click last page button
    const lastButtons = screen.getAllByRole("button", { name: /last page/i });
    fireEvent.click(lastButtons[0]);
    expect(screen.getAllByText(/page 3 of 3/i)).toHaveLength(2);

    // Click first page button
    const firstButtons = screen.getAllByRole("button", { name: /first page/i });
    fireEvent.click(firstButtons[0]);
    expect(screen.getAllByText(/page 1 of 3/i)).toHaveLength(2);
  });

  it("should display correct data formatting", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        weight: 180.5,
        trend: 180.2,
        fatRatio: 0.25,
        fatTrend: 0.245,
        time: "08:30",
      },
    ];

    render(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

    // Check date format
    expect(screen.getByText(/Jan 15, 2024/)).toBeInTheDocument();

    // Check weight formatting (lbs with units)
    expect(screen.getByText("180.5 lb")).toBeInTheDocument();
    expect(screen.getByText("180.2 lb")).toBeInTheDocument();

    // Check fat percentage formatting
    expect(screen.getByText("25.0%")).toBeInTheDocument();
    expect(screen.getByText("24.5%")).toBeInTheDocument();
  });

  it("should display metric units correctly", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        weight: 81.6, // kg
        trend: 81.5,
      },
    ];

    render(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={true} />);

    // Check metric weight formatting (with units)
    expect(screen.getByText("81.6 kg")).toBeInTheDocument();
    expect(screen.getByText("81.5 kg")).toBeInTheDocument();
  });

  it("shows a dash in every value column of a computed reading without values", () => {
    const readings: ScaleReading[] = [{ date: LocalDate.of(2024, 1, 15) }];

    render(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Date",
      "Actual Weight",
      "Trend Weight",
      "Actual Fat %",
      "Trend Fat %",
    ]);
    expect(bodyRows()).toEqual([["Jan 15, 2024", "-", "-", "-", "-"]]);
  });

  it("shows a dash for the missing time, weight and body fat of a provider reading", () => {
    const readings: ScaleReading[] = [{ date: LocalDate.of(2024, 1, 15), provider: "fitbit" }];

    render(<ScaleReadingsDataTable readings={readings} viewType="fitbit" useMetric={false} />);

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Date", "Time", "Weight", "Body Fat %"]);
    expect(bodyRows()).toEqual([["Jan 15, 2024", "-", "-", "-"]]);
  });

  it("keeps present values next to dashes in the same row", () => {
    const readings: ScaleReading[] = [{ date: LocalDate.of(2024, 1, 15), weight: 180.5, fatTrend: 0.245 }];

    render(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

    expect(bodyRows()).toEqual([["Jan 15, 2024", "180.5 lb", "-", "-", "24.5%"]]);
  });

  it("should display time for provider views", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        time: "08:30",
        weight: 180.5,
      },
    ];

    render(<ScaleReadingsDataTable readings={readings} viewType="fitbit" useMetric={false} />);

    expect(screen.getByText(/8:30/)).toBeInTheDocument();
  });

  it("should handle empty readings array", () => {
    render(<ScaleReadingsDataTable readings={[]} viewType="computed" useMetric={false} />);

    // Should still render headers
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Actual Weight")).toBeInTheDocument();

    // No data rows
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(1); // Only header row
  });
});
