import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { LocalDate } from "@js-joda/core";
import RecentReadings from "./RecentReadings";
import { useDashboardData } from "../../lib/dashboard/hooks";
import { recentDate } from "../../lib/core/dates";
import { formatMeasurement } from "../../lib/core/numbers";

// Mock the dependencies
vi.mock("../../lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

vi.mock("../../lib/core/dates", () => ({
  recentDate: vi.fn(),
}));

vi.mock("../../lib/core/numbers", () => ({
  formatMeasurement: vi.fn(),
}));

const mockUseDashboardData = vi.mocked(useDashboardData);
const mockRecentDate = vi.mocked(recentDate);
const mockFormatMeasurement = vi.mocked(formatMeasurement);

describe("RecentReadings", () => {
  const mockDataPoints = [
    {
      date: LocalDate.of(2024, 1, 1),
      actual: 180.5,
      trend: 181.0,
    },
    {
      date: LocalDate.of(2024, 1, 2),
      actual: 180.2,
      trend: 180.8,
    },
    {
      date: LocalDate.of(2024, 1, 3),
      actual: 179.8,
      trend: 180.6,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDashboardData.mockReturnValue({
      dataPoints: mockDataPoints,
      mode: ["weight", vi.fn()],
      profile: { useMetric: false },
    } as any);
    mockRecentDate.mockImplementation((date) => date.toString());
    mockFormatMeasurement.mockImplementation((value) => value.toString());
  });

  it("should render the heading with correct mode", () => {
    render(<RecentReadings />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Recent Weight Readings");
  });

  it("should render table headers", () => {
    render(<RecentReadings />);

    expect(screen.getByRole("columnheader", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Actual" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Trend" })).toBeInTheDocument();
  });

  it("should render all data points", () => {
    render(<RecentReadings />);

    // Check that all dates are rendered
    expect(mockRecentDate).toHaveBeenCalledTimes(3);
    expect(mockRecentDate).toHaveBeenCalledWith(LocalDate.of(2024, 1, 1));
    expect(mockRecentDate).toHaveBeenCalledWith(LocalDate.of(2024, 1, 2));
    expect(mockRecentDate).toHaveBeenCalledWith(LocalDate.of(2024, 1, 3));
  });

  it("should format measurements correctly", () => {
    render(<RecentReadings />);

    // Check actual values formatting
    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.5, { type: "weight", metric: false, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.2, { type: "weight", metric: false, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(179.8, { type: "weight", metric: false, units: false });

    // Check trend values formatting
    expect(mockFormatMeasurement).toHaveBeenCalledWith(181.0, { type: "weight", metric: false, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.8, { type: "weight", metric: false, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.6, { type: "weight", metric: false, units: false });
  });

  it("should handle metric units", () => {
    mockUseDashboardData.mockReturnValue({
      dataPoints: mockDataPoints.slice(0, 1),
      mode: ["weight", vi.fn()],
      profile: { useMetric: true },
    } as any);

    render(<RecentReadings />);

    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.5, { type: "weight", metric: true, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(181.0, { type: "weight", metric: true, units: false });
  });

  it("should handle different modes", () => {
    mockUseDashboardData.mockReturnValue({
      dataPoints: mockDataPoints.slice(0, 1),
      mode: ["fatpercent", vi.fn()],
      profile: { useMetric: false },
    } as any);

    render(<RecentReadings />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Recent Fat % Readings");
    expect(mockFormatMeasurement).toHaveBeenCalledWith(180.5, { type: "fatpercent", metric: false, units: false });
    expect(mockFormatMeasurement).toHaveBeenCalledWith(181.0, { type: "fatpercent", metric: false, units: false });
  });

  it("should show last 14 readings in reverse order", () => {
    const manyDataPoints = Array.from({ length: 20 }, (_, i) => ({
      date: LocalDate.of(2024, 1, i + 1),
      actual: 180 + i,
      trend: 181 + i,
    }));

    mockUseDashboardData.mockReturnValue({
      dataPoints: manyDataPoints,
      mode: ["weight", vi.fn()],
      profile: { useMetric: false },
    } as any);

    render(<RecentReadings />);

    // Should call recentDate for the last 14 items in reverse order
    expect(mockRecentDate).toHaveBeenCalledTimes(14);

    // First call should be for the most recent date (day 20)
    expect(mockRecentDate).toHaveBeenNthCalledWith(1, LocalDate.of(2024, 1, 20));
    // Last call should be for day 7 (20 - 14 + 1)
    expect(mockRecentDate).toHaveBeenNthCalledWith(14, LocalDate.of(2024, 1, 7));
  });

  it("should handle empty data points", () => {
    mockUseDashboardData.mockReturnValue({
      dataPoints: [],
      mode: ["weight", vi.fn()],
      profile: { useMetric: false },
    } as any);

    render(<RecentReadings />);

    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("Recent Weight Readings");
    expect(mockRecentDate).not.toHaveBeenCalled();
    expect(mockFormatMeasurement).not.toHaveBeenCalled();
  });
});
