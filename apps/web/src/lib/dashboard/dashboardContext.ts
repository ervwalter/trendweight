import { createContext } from "react";
import type { DataPoint, Delta, Measurement, Mode, ProfileData, TimeRange } from "../core/interfaces";
import type { ProviderSyncStatus } from "../api/types";

export interface DashboardData {
  dataPoints: DataPoint[];
  measurements: Measurement[];
  mode: [Mode, (mode: Mode) => void];
  timeRange: [TimeRange, (timeRange: TimeRange) => void];
  profile: ProfileData;
  profileError?: unknown;
  weightSlope: number;
  activeSlope: number;
  deltas: Delta[];
  providerStatus?: Record<string, ProviderSyncStatus>;
}

export const dashboardContext = createContext<DashboardData | undefined>(undefined);
