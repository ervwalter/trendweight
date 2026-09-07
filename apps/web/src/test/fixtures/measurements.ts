import { LocalDate } from "@js-joda/core";
import type { ApiComputedMeasurement, ApiSourceData, MeasurementsResponse } from "@/lib/api/types";
import type { DataPoint, Measurement } from "@/lib/core/interfaces";

const toLocalDate = (date: string | LocalDate): LocalDate => (typeof date === "string" ? LocalDate.parse(date) : date);

// One backend computed measurement (weights in kg, fat as a 0-1 ratio)
export function buildComputedMeasurement(overrides: Partial<ApiComputedMeasurement> = {}): ApiComputedMeasurement {
  return {
    date: "2024-01-15",
    actualWeight: 80,
    trendWeight: 80.5,
    weightIsInterpolated: false,
    fatIsInterpolated: false,
    actualFatPercent: 0.225,
    trendFatPercent: 0.23,
    trendFatMass: 18.5,
    trendLeanMass: 62,
    ...overrides,
  };
}

// One provider's raw readings as returned with includeSource=true
export function buildSourceData(overrides: Partial<ApiSourceData> = {}): ApiSourceData {
  return {
    source: "withings",
    lastUpdate: "2024-01-15T06:30:00Z",
    measurements: [{ date: "2024-01-15", time: "06:30:00", weight: 80, fatRatio: 0.225 }],
    ...overrides,
  };
}

// GET /api/data response with a single computed measurement unless overridden
export function buildMeasurementsResponse(overrides: Partial<MeasurementsResponse> = {}): MeasurementsResponse {
  return {
    computedMeasurements: [buildComputedMeasurement()],
    isMe: true,
    ...overrides,
  };
}

export type MeasurementOverrides = Partial<Omit<Measurement, "date">> & { date?: string | LocalDate };

// A frontend Measurement (already converted to the user's display unit)
export function buildMeasurement({ date = "2024-01-15", ...overrides }: MeasurementOverrides = {}): Measurement {
  return {
    date: toLocalDate(date),
    source: "computed",
    actualWeight: 80,
    trendWeight: 80.5,
    actualFatPercent: 0.225,
    trendFatPercent: 0.23,
    actualFatMass: 18,
    trendFatMass: 18.5,
    actualLeanMass: 62,
    trendLeanMass: 62,
    weightIsInterpolated: false,
    fatIsInterpolated: false,
    ...overrides,
  };
}

// A single chart/stat data point; actual defaults to the trend value
export function buildDataPoint(date: string | LocalDate, trend: number, actual: number = trend, isInterpolated: boolean = false): DataPoint {
  return { date: toLocalDate(date), source: "computed", actual, trend, isInterpolated };
}

// Consecutive daily data points starting at startIso, one per trend value
export function dailyDataPoints(startIso: string, trends: number[]): DataPoint[] {
  const start = LocalDate.parse(startIso);
  return trends.map((trend, index) => buildDataPoint(start.plusDays(index), trend));
}
