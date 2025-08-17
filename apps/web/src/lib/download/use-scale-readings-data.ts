import { useMemo } from "react";
import { LocalDate, LocalTime } from "@js-joda/core";
import { useDownloadData, useProfile } from "@/lib/api/queries";
import type { ScaleReading, ViewType } from "@/components/download/types";
import { convertMeasurements } from "@/lib/dashboard/computations/conversion";

export function useScaleReadingsData(viewType: ViewType, sortNewestFirst: boolean) {
  // Get profile data directly
  const { data: profile } = useProfile();

  // Get both computed measurements and source data for downloads
  const { computedMeasurements, sourceData: apiSourceData } = useDownloadData();

  // Transform data based on view type
  const readings = useMemo(() => {
    let data: ScaleReading[] = [];

    if (viewType === "computed") {
      // Use computed measurements with proper unit conversion
      const convertedMeasurements = convertMeasurements(computedMeasurements, profile);
      data = convertedMeasurements.map((m) => ({
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
      const providerData = apiSourceData?.find((d) => d.source === viewType);
      if (providerData?.measurements) {
        // Apply conversion factor for non-metric users
        const conversionFactor = profile?.useMetric ? 1 : 2.20462262;
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
  }, [viewType, apiSourceData, computedMeasurements, profile, sortNewestFirst]);

  return {
    readings,
    profile,
  };
}
