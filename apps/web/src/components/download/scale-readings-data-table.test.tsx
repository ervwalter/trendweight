import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client before any other imports
vi.mock("../../lib/realtime/client", () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn((callback) => {
        if (callback) callback("subscribed");
        return vi.fn();
      }),
      unsubscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}));

// Mock realtime progress hook to return null (no progress)
vi.mock("../../lib/realtime/use-realtime-progress", () => ({
  useRealtimeProgress: () => ({
    status: null,
    message: null,
    providers: null,
    isTerminal: false,
  }),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import { ScaleReadingsDataTable } from "./scale-readings-data-table";
import { LocalDate } from "@js-joda/core";
import type { ScaleReading } from "./types";
import { SyncProgressProvider } from "../dashboard/sync-progress";

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

  // Helper to render with providers
  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<SyncProgressProvider>{ui}</SyncProgressProvider>);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render table with correct headers for computed view", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Actual Weight")).toBeInTheDocument();
    expect(screen.getByText("Trend Weight")).toBeInTheDocument();
    expect(screen.getByText("Actual Fat %")).toBeInTheDocument();
    expect(screen.getByText("Trend Fat %")).toBeInTheDocument();
    expect(screen.queryByText("Time")).not.toBeInTheDocument();
  });

  it("should render table with correct headers for provider view", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} viewType="fitbit" />);

    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Weight")).toBeInTheDocument();
    expect(screen.getByText("Body Fat %")).toBeInTheDocument();
    expect(screen.queryByText("Trend Weight")).not.toBeInTheDocument();
    expect(screen.queryByText("Trend Fat %")).not.toBeInTheDocument();
  });

  it("should display pagination controls when more than 50 items", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

    // We have top and bottom pagination, so we'll have multiple buttons
    expect(screen.getAllByRole("button", { name: /previous/i })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: /next/i })).toHaveLength(2);
    expect(screen.getAllByText(/page 1 of 3/i)).toHaveLength(2);
    expect(screen.getByText(/125 total readings/i)).toBeInTheDocument();
  });

  it("should not display pagination controls when 50 or fewer items", () => {
    const props = { ...defaultProps, readings: createMockReadings(50) };
    renderWithProviders(<ScaleReadingsDataTable {...props} />);

    expect(screen.queryByRole("button", { name: /previous/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByText(/50 total readings/i)).toBeInTheDocument();
  });

  it("should paginate data correctly", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

    // Check first page shows 50 items
    const rows = screen.getAllByRole("row");
    // Header row + 50 data rows
    expect(rows).toHaveLength(51);
  });

  it("should handle page navigation", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

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
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

    // Both previous buttons should be disabled on first page
    const prevButtons = screen.getAllByRole("button", { name: /previous/i });
    expect(prevButtons[0]).toBeDisabled();
    expect(prevButtons[1]).toBeDisabled();
  });

  it("should disable next button on last page", () => {
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

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
    renderWithProviders(<ScaleReadingsDataTable {...defaultProps} />);

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

    renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

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

    renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={true} />);

    // Check metric weight formatting (with units)
    expect(screen.getByText("81.6 kg")).toBeInTheDocument();
    expect(screen.getByText("81.5 kg")).toBeInTheDocument();
  });

  it("should handle interpolated data styling", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        weight: 180.5,
        weightIsInterpolated: true,
        fatRatio: 0.25,
        fatIsInterpolated: true,
      },
    ];

    const { container } = renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="fitbit" useMetric={false} />);

    // Check for italic styling on interpolated values
    // The spans inside the td cells have the italic class
    const cells = container.querySelectorAll("td span");
    const interpolatedCells = Array.from(cells).filter((cell) => cell.classList.contains("italic") && cell.classList.contains("text-muted-foreground"));

    // We should have two interpolated values (weight and fat)
    expect(interpolatedCells.length).toBe(2);
  });

  it("should handle missing data with dashes", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        // No weight, trend, or fat data
      },
    ];

    renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

    // Should show dashes for missing data
    const dashes = screen.getAllByText("-");
    expect(dashes.length).toBeGreaterThan(0);
  });

  it("should display time for provider views", () => {
    const readings = [
      {
        date: LocalDate.of(2024, 1, 15),
        time: "08:30",
        weight: 180.5,
      },
    ];

    renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="fitbit" useMetric={false} />);

    expect(screen.getByText(/8:30/)).toBeInTheDocument();
  });

  it("should handle empty readings array", () => {
    renderWithProviders(<ScaleReadingsDataTable readings={[]} viewType="computed" useMetric={false} />);

    // Should still render headers
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Actual Weight")).toBeInTheDocument();

    // No data rows
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(1); // Only header row
  });

  it("should apply striped row styling", () => {
    const readings = createMockReadings(3);
    const { container } = renderWithProviders(<ScaleReadingsDataTable readings={readings} viewType="computed" useMetric={false} />);

    const rows = container.querySelectorAll("tbody tr");
    expect(rows[0]).not.toHaveClass("bg-muted");
    expect(rows[1]).toHaveClass("bg-muted");
    expect(rows[2]).not.toHaveClass("bg-muted");
  });
});
