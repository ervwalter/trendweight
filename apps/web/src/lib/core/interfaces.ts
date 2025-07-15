import type { LocalDate, LocalDateTime } from "@js-joda/core";

export interface RawMeasurement {
  date: string; // "2024-01-15"
  time: string; // "06:30:00"
  weight: number; // kg
  fatRatio?: number; // 0-1 ratio
}

export type Sources = "withings" | "fitbit";

export interface SourceData {
  source: Sources;
  lastUpdate: string;
  measurements?: RawMeasurement[];
}

export interface SourceMeasurement {
  date: LocalDate;
  timestamp: LocalDateTime;
  source: string;
  weight: number;
  fatRatio?: number;
  weightIsInterpolated?: boolean;
  fatRatioIsInterpolated?: boolean;
}

export interface AccessToken {
  userid: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  scope: string;
  expires_at?: string;
}

export interface ProviderLink {
  token: AccessToken;
  updateReason: string;
  updateTime: string;
}

export interface Links {
  uid: string;
  withings?: ProviderLink;
  fitbit?: ProviderLink;
}

export interface ProfileData {
  firstName: string;
  goalStart?: string;
  goalWeight?: number;
  plannedPoundsPerWeek?: number;
  dayStartOffset?: number;
  useMetric: boolean;
  showCalories?: boolean;
  sharingToken?: string;
  sharingEnabled?: boolean;
}

export interface SettingsData extends ProfileData {
  uid: string;
  email: string;
}

export interface SharingData {
  sharingEnabled: boolean;
  sharingToken?: string;
}

export const Modes = {
  weight: "Weight",
  fatpercent: "Fat %",
  fatmass: "Fat Mass",
  leanmass: "Lean Mass",
} as const;

export type Mode = keyof typeof Modes;

export const TimeRanges = {
  "4w": "4 weeks",
  "3m": "3 months",
  "6m": "6 months",
  "1y": "1 year",
  all: "All Time",
} as const;

export type TimeRange = keyof typeof TimeRanges;

export interface Measurement {
  date: LocalDate;
  source: string;
  actualWeight: number;
  actualFatMass?: number;
  actualFatPercent?: number;
  actualLeanMass?: number;
  trendWeight: number;
  trendFatMass?: number;
  trendFatPercent?: number;
  trendLeanMass?: number;
  weightIsInterpolated: boolean;
  fatIsInterpolated: boolean;
}

export interface DataPoint {
  date: LocalDate;
  source: string;
  actual: number;
  trend: number;
  isInterpolated: boolean;
}

export interface Delta {
  description: string;
  period: number;
  delta: number;
}
