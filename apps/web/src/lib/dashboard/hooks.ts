import { useContext, useMemo, useState } from "react";
import { dashboardContext } from "./dashboard-context";
import type { DashboardData } from "./dashboard-context";
import { useDashboardQueries } from "@/lib/api/queries";
import { TimeRanges, type Mode, type TimeRange } from "@/lib/core/interfaces";
import { usePersistedState } from "@/lib/hooks/use-persisted-state";
import { useSharingCode } from "@/lib/hooks/use-sharing-code";
import { useSharingSearchParams } from "@/lib/hooks/use-sharing-search-params";
import { SHARED_RANGES } from "@/lib/routes/sharing-search";
import { computeDataPoints } from "./computations/data-points";
import { computeActiveSlope, computeDeltas, computeWeightSlope } from "./computations/stats";
import { convertMeasurements } from "./computations/conversion";

// A stale or hand-edited localStorage value would otherwise render a chart with no series
const isTimeRange = (value: unknown): value is TimeRange => typeof value === "string" && value in TimeRanges;
// Shared and embedded dashboards additionally have no controls to leave explore mode
const isSharedTimeRange = (value: unknown): value is TimeRange => isTimeRange(value) && SHARED_RANGES.includes(value);

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

  // Use search params for initial values, otherwise use defaults/persisted.
  // The persisted range is the viewer's own preference: it is neither read nor written when a
  // range param is present or when viewing someone else's (shared/embedded/demo) dashboard.
  const [mode, setMode] = useState<Mode>(searchParams.mode || "weight");
  const [timeRange, setTimeRange] = usePersistedState<TimeRange>(
    "timeRange",
    searchParams.range || "4w",
    !searchParams.range && !sharingCode,
    sharingCode ? isSharedTimeRange : isTimeRange,
  );

  // Get profile and measurement data in parallel
  const { profile, measurementData: computedMeasurements, providerStatus, isMe } = useDashboardQueries(sharingCode);

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
    },
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
