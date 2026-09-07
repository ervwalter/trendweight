import { vi } from "vitest";
import type { DashboardData } from "@/lib/dashboard/dashboard-context";
import { buildProfileData } from "./profile";

// The value the dashboard context provides to components. Empty data, weight mode, 4 weeks,
// mock setters, and a metric profile with a goal (see buildProfileData); override per test.
export function buildDashboardData(overrides: Partial<DashboardData> = {}): DashboardData {
  return {
    dataPoints: [],
    measurements: [],
    mode: ["weight", vi.fn()],
    timeRange: ["4w", vi.fn()],
    profile: buildProfileData(),
    weightSlope: 0,
    activeSlope: 0,
    deltas: [],
    providerStatus: undefined,
    isMe: true,
    ...overrides,
  };
}
