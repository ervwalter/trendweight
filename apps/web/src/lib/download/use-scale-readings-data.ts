import { useMemo } from "react";
import { LocalDate, LocalTime } from "@js-joda/core";
import { useDashboardQueries } from "../api/queries";
import { useComputeDashboardData } from "../dashboard/hooks";
import type { ScaleReading, ViewType } from "../../components/download/types";

export function useScaleReadingsData(viewType: ViewType, sortNewestFirst: boolean) {
  const dashboardData = useComputeDashboardData();
  const { measurementData: apiSourceData } = useDashboardQueries();

  // Transform data based on view type
  const readings = useMemo(() => {
    let data: ScaleReading[] = [];

    if (viewType === "computed") {
      // Use measurements for computed view to get body fat data
      data = dashboardData.measurements.map((m) => ({
        date: m.date,
        weight: m.actualWeight,
        trend: m.trendWeight,
        fatRatio: m.actualFatPercent,
        fatTrend: m.trendFatPercent,
        weightIsInterpolated: m.weightIsInterpolated,
        fatIsInterpolated: m.fatIsInterpolated,
      }));
    } else {
      // Single provider data
      const providerData = apiSourceData.find((d) => d.source === viewType);
      if (providerData?.measurements) {
        // Apply conversion factor for non-metric users
        const conversionFactor = dashboardData.profile.useMetric ? 1 : 2.20462262;
        data = providerData.measurements.map((m) => ({
          date: LocalDate.parse(m.date),
          time: m.time,
          weight: m.weight ? m.weight * conversionFactor : undefined,
          fatRatio: m.fatRatio,
          provider: viewType,
        }));
      }
    }

    // Sort data
    data.sort((a, b) => {
      const comparison = a.date.compareTo(b.date);
      // If dates are equal and we have times, compare by time
      if (comparison === 0 && a.time && b.time) {
        const timeA = LocalTime.parse(a.time);
        const timeB = LocalTime.parse(b.time);
        const timeComparison = timeA.compareTo(timeB);
        return sortNewestFirst ? -timeComparison : timeComparison;
      }
      return sortNewestFirst ? -comparison : comparison;
    });

    return data;
  }, [viewType, apiSourceData, dashboardData.measurements, dashboardData.profile.useMetric, sortNewestFirst]);

  return {
    readings,
    profile: dashboardData.profile,
  };
}
