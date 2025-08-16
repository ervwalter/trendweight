import { useContext, useMemo, useState } from "react";
import { dashboardContext } from "./dashboard-context";
import type { DashboardData } from "./dashboard-context";
import { useDashboardQueries } from "../api/queries";
import type { Mode, TimeRange } from "../core/interfaces";
import { usePersistedState } from "../hooks/use-persisted-state";
import { computeDataPoints } from "./computations/data-points";
import { computeActiveSlope, computeDeltas, computeWeightSlope } from "./computations/stats";
import { convertMeasurements } from "./computations/conversion";

export const useDashboardData = (): DashboardData => {
  const data = useContext(dashboardContext);
  if (!data) {
    throw new Error("Called useDashboardData() when the provider is not present.");
  }
  return data;
};

export const useComputeDashboardData = (sharingCode?: string): DashboardData => {
  const [mode, setMode] = useState<Mode>("weight");
  const [timeRange, setTimeRange] = usePersistedState<TimeRange>("timeRange", "4w");

  // Get profile and measurement data in parallel
  const { profile, measurementData: computedMeasurements, providerStatus, profileError, isMe } = useDashboardQueries(sharingCode);

  // Transform computed measurements from backend to frontend format with unit conversion
  const measurements = useMemo(() => {
    return convertMeasurements(computedMeasurements, profile);
  }, [computedMeasurements, profile]);

  const dataPoints = useMemo(() => computeDataPoints(mode, measurements), [measurements, mode]);

  const weightSlope = useMemo(() => computeWeightSlope(measurements), [measurements]);

  const activeSlope = useMemo(() => computeActiveSlope(mode, dataPoints), [mode, dataPoints]);

  const deltas = useMemo(() => computeDeltas(mode, dataPoints), [mode, dataPoints]);

  // Return appropriate data based on profile existence
  const data: DashboardData = {
    dataPoints,
    measurements,
    profile: profile || {
      firstName: "",
      useMetric: false,
      goalStart: undefined,
      goalWeight: 0,
      plannedPoundsPerWeek: 0,
      dayStartOffset: 0,
      showCalories: false,
      sharingToken: undefined,
    },
    profileError,
    mode: [mode, setMode],
    timeRange: [timeRange, setTimeRange],
    weightSlope,
    activeSlope,
    deltas,
    providerStatus,
    isMe: isMe ?? true,
  };

  return data;
};
