import { useContext, useMemo, useState } from "react";
import { dashboardContext } from "./dashboard-context";
import type { DashboardData } from "./dashboard-context";
import { useDashboardQueries } from "../api/queries";
import type { Mode, TimeRange } from "../core/interfaces";
import { usePersistedState } from "../hooks/use-persisted-state";
import { useSharingCode } from "../hooks/use-sharing-code";
import { useSharingSearchParams } from "../hooks/use-sharing-search-params";
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

export const useComputeDashboardData = (): DashboardData => {
  const sharingCode = useSharingCode();
  const searchParams = useSharingSearchParams();

  // Use search params for initial values, otherwise use defaults/persisted
  // Don't persist to localStorage when search params are present
  const [mode, setMode] = useState<Mode>(searchParams.mode || "weight");
  const [timeRange, setTimeRange] = usePersistedState<TimeRange>(
    "timeRange",
    searchParams.range || "4w",
    !searchParams.range, // Only persist if no range param
  );

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
