import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { DashboardProvider } from "@/lib/dashboard/context";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { LocalDate } from "@js-joda/core";
import type { DataPoint, Measurement } from "@/lib/core/interfaces";

// Default test data
export const createTestDataPoint = (date: string, trend: number): DataPoint => ({
  date: LocalDate.parse(date),
  source: "test",
  actual: trend,
  trend,
  isInterpolated: false,
});

export const createTestMeasurement = (date: string, weight: number): Measurement => ({
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

export const defaultDashboardData: DashboardData = {
  dataPoints: [],
  measurements: [],
  mode: ["weight", () => {}],
  timeRange: ["4w", () => {}],
  profile: {
    firstName: "Test",
    useMetric: false,
    goalStart: undefined,
    goalWeight: undefined,
    plannedPoundsPerWeek: undefined,
    dayStartOffset: 0,
    showCalories: false,
    sharingToken: undefined,
  },
  profileError: undefined,
  weightSlope: 0,
  activeSlope: 0,
  deltas: [],
  providerStatus: {},
  isMe: true,
};

// Helper to render dashboard components with context
export function renderWithDashboard(ui: ReactElement, dashboardData: Partial<DashboardData> = {}) {
  const mergedData = {
    ...defaultDashboardData,
    ...dashboardData,
    // Ensure nested objects are properly merged
    profile: {
      ...defaultDashboardData.profile,
      ...(dashboardData.profile || {}),
    },
  };

  return render(<DashboardProvider data={mergedData as DashboardData}>{ui}</DashboardProvider>);
}
