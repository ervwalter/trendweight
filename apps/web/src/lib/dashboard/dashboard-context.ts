import { createContext } from "react";
import type { DataPoint, Delta, Measurement, Mode, ProfileData, TimeRange } from "@/lib/core/interfaces";
import type { ProviderSyncStatus } from "@/lib/api/types";

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
  isMe: boolean;
}

export const dashboardContext = createContext<DashboardData | undefined>(undefined);
