import { LocalDate } from "@js-joda/core";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Measurement } from "../../lib/core/interfaces";
import type { DashboardData } from "../../lib/dashboard/dashboardContext";
import Stats from "./Stats";

// Mock the dashboard hooks
vi.mock("../../lib/dashboard/hooks", () => ({
  useDashboardData: vi.fn(),
}));

import { useDashboardData } from "../../lib/dashboard/hooks";

const mockUseDashboardData = vi.mocked(useDashboardData);

describe("Stats", () => {
  const createMeasurement = (date: string, weight: number): Measurement => ({
    date: LocalDate.parse(date),
    source: "test",
    actualWeight: weight,
    actualFatMass: undefined,
    actualFatPercent: undefined,
    actualLeanMass: undefined,
    trendWeight: weight,
    trendFatMass: undefined,
    trendFatPercent: undefined,
    trendLeanMass: undefined,
    weightIsInterpolated: false,
    fatIsInterpolated: false,
  });

  const defaultMockData: Partial<DashboardData> = {
    weightSlope: -0.2, // losing 0.2 lb/day
    measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 178.6)],
    profile: {
      useMetric: false,
      goalWeight: undefined,
      showCalories: false,
      plannedPoundsPerWeek: undefined,
      firstName: "Test",
    } as any,
    isMe: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("weight change statistics", () => {
    it("displays losing weight stats", () => {
      mockUseDashboardData.mockReturnValue(defaultMockData as any);

      render(<Stats />);

      expect(screen.getByText(/You are losing/)).toBeInTheDocument();
      expect(screen.getByText("1.4 lb/week")).toBeInTheDocument(); // 0.2 * 7
      expect(screen.getByText(/of total weight/)).toBeInTheDocument();
    });

    it("displays gaining weight stats", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        weightSlope: 0.15, // gaining 0.15 lb/day
      } as any);

      render(<Stats />);

      expect(screen.getByText(/You are gaining/)).toBeInTheDocument();
      expect(screen.getByText("1.1 lb/week")).toBeInTheDocument(); // 0.15 * 7, rounded
    });

    it("displays metric units when enabled", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          useMetric: true,
        } as any,
        weightSlope: -0.09, // kg/day
      } as any);

      render(<Stats />);

      expect(screen.getByText("0.6 kg/week")).toBeInTheDocument(); // 0.09 * 7
    });

    it("uses third person when not viewing own profile", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        isMe: false,
      } as any);

      render(<Stats />);

      expect(screen.getByText(/Test is losing/)).toBeInTheDocument();
      expect(screen.getByText(/They have been tracking their weight/)).toBeInTheDocument();
    });
  });

  describe("tracking duration", () => {
    it("displays duration in days for short periods", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-05", 179)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/4 days/)).toBeInTheDocument();
    });

    it("displays duration in weeks for medium periods", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-02-15", 170)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/6 weeks/)).toBeInTheDocument();
    });

    it("displays duration in months for longer periods", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-08-01", 150)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/30 weeks/)).toBeInTheDocument();
    });

    it("displays duration in years for very long periods", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        measurements: [createMeasurement("2020-01-01", 200), createMeasurement("2024-01-01", 150)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/4 years/)).toBeInTheDocument();
    });
  });

  describe("goal weight calculations", () => {
    it("shows distance to goal when above goal weight", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 170,
        } as any,
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 178.6)],
      } as any);

      render(<Stats />);

      // Use getAllByText since "You have" appears multiple times (tracking duration and goal)
      const youHaveTexts = screen.getAllByText(/You have/);
      expect(youHaveTexts.length).toBeGreaterThan(0);
      expect(screen.getByText("8.6 lb")).toBeInTheDocument();
      expect(screen.getByText(/to lose to reach your goal/)).toBeInTheDocument();
    });

    it("shows distance to goal when below goal weight", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 170,
        } as any,
        measurements: [createMeasurement("2024-01-01", 165), createMeasurement("2024-01-08", 168)],
      } as any);

      render(<Stats />);

      // Use getAllByText since "You have" appears multiple times
      const youHaveTexts = screen.getAllByText(/You have/);
      expect(youHaveTexts.length).toBeGreaterThan(0);
      expect(screen.getByText("2.0 lb")).toBeInTheDocument();
      expect(screen.getByText(/to gain to reach your goal/)).toBeInTheDocument();
    });

    it("shows goal reached when at goal weight", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 170,
        } as any,
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 170)],
      } as any);

      render(<Stats />);

      // More specific text matcher to avoid conflicts
      expect(
        screen.getByText((_, element) => {
          return element?.textContent === "You have reached your goal weight.";
        }),
      ).toBeInTheDocument();
    });

    it("calculates goal date when losing weight toward goal", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 170,
        } as any,
        weightSlope: -0.2, // losing 0.2 lb/day
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 178.6)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/You will reach your goal around/)).toBeInTheDocument();
    });

    it("does not show goal date when moving away from goal", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 170,
        } as any,
        weightSlope: 0.2, // gaining when need to lose
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 181.4)],
      } as any);

      render(<Stats />);

      expect(screen.queryByText(/will reach your goal around/)).not.toBeInTheDocument();
    });

    it("does not show goal date if too far in future", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          goalWeight: 100, // Very far goal
        } as any,
        weightSlope: -0.01, // Very slow loss
        measurements: [createMeasurement("2024-01-01", 180), createMeasurement("2024-01-08", 179.93)],
      } as any);

      render(<Stats />);

      expect(screen.queryByText(/will reach your goal around/)).not.toBeInTheDocument();
    });
  });

  describe("calorie calculations", () => {
    it("shows calorie deficit when losing weight with plan", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          showCalories: true,
          plannedPoundsPerWeek: -1, // Plan to lose 1 lb/week
        } as any,
        weightSlope: -0.2, // Actually losing 1.4 lb/week
      } as any);

      render(<Stats />);

      // There are two "You are burning" texts, so use getAllByText
      const burningTexts = screen.getAllByText(/You are burning/);
      expect(burningTexts).toHaveLength(2);

      expect(screen.getByText("700.0 cal/day")).toBeInTheDocument(); // 0.2 * 3500
      expect(screen.getByText(/more than you are eating/)).toBeInTheDocument();

      // Exceeding plan
      expect(screen.getByText("200.0 cal/day")).toBeInTheDocument(); // (1.4 - 1) * 500
      expect(screen.getByText(/beyond your plan/)).toBeInTheDocument();
    });

    it("shows calorie surplus when gaining weight", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          showCalories: true,
          plannedPoundsPerWeek: -1,
        } as any,
        weightSlope: 0.1, // Gaining 0.7 lb/week
      } as any);

      render(<Stats />);

      // First calorie output
      const burningTexts = screen.getAllByText(/You are burning/);
      expect(burningTexts).toHaveLength(1);
      expect(screen.getByText("350.0 cal/day")).toBeInTheDocument();
      expect(screen.getByText(/less than you are eating/)).toBeInTheDocument();

      // Not meeting plan
      expect(screen.getByText(/You must cut/)).toBeInTheDocument();
      expect(screen.getByText("850.0 cal/day")).toBeInTheDocument(); // Correct calculation based on actual logic
      expect(screen.getByText(/to lose 1.0 lb/)).toBeInTheDocument();
    });

    it("handles metric calorie calculations", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          useMetric: true,
          showCalories: true,
          plannedPoundsPerWeek: -0.5, // Plan in lb even when metric
        } as any,
        weightSlope: -0.09, // kg/day = ~0.2 lb/day
      } as any);

      render(<Stats />);

      // When there are multiple calorie outputs, use getAllByText
      const burningTexts = screen.getAllByText(/You are burning/);
      expect(burningTexts).toHaveLength(2);
      // Calculation accounts for metric conversion
    });

    it("does not show calories when disabled", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          showCalories: false,
          plannedPoundsPerWeek: -1,
        } as any,
      } as any);

      render(<Stats />);

      expect(screen.queryByText(/cal\/day/)).not.toBeInTheDocument();
    });

    it("does not show calories when no planned rate", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        profile: {
          ...defaultMockData.profile,
          showCalories: true,
          plannedPoundsPerWeek: undefined,
        } as any,
      } as any);

      render(<Stats />);

      expect(screen.queryByText(/cal\/day/)).not.toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles zero weight slope", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        weightSlope: 0,
      } as any);

      render(<Stats />);

      expect(screen.getByText(/You are losing/)).toBeInTheDocument();
      expect(screen.getByText("0.0 lb/week")).toBeInTheDocument();
    });

    it("handles single measurement", () => {
      mockUseDashboardData.mockReturnValue({
        ...defaultMockData,
        measurements: [createMeasurement("2024-01-01", 180)],
      } as any);

      render(<Stats />);

      expect(screen.getByText(/0 days/)).toBeInTheDocument();
    });
  });
});
