import { LocalDate } from "@js-joda/core";
import type { Measurement, ProfileData } from "../../core/interfaces";
import type { ApiComputedMeasurement } from "../../api/types";

/**
 * Converts backend computed measurements to frontend format with proper unit conversion
 */
export function convertMeasurements(computedMeasurements: ApiComputedMeasurement[], profile: ProfileData | null): Measurement[] {
  if (!computedMeasurements) return [];

  // Determine conversion factor (backend stores in kg, convert to lbs for non-metric users)
  const useMetric = profile?.useMetric ?? false;
  const conversionFactor = useMetric ? 1 : 2.20462262; // kg to lbs

  return computedMeasurements.map((computed: ApiComputedMeasurement) => {
    // Parse date string to LocalDate
    const date = LocalDate.parse(computed.date);

    // Convert weights from kg to user's preferred unit
    const actualWeight = computed.actualWeight * conversionFactor;
    const trendWeight = computed.trendWeight * conversionFactor;

    // Calculate fat/lean mass if fat data is available (already in correct units after weight conversion)
    const actualFatMass = computed.actualFatPercent ? actualWeight * computed.actualFatPercent : undefined;
    const actualLeanMass = computed.actualFatPercent ? actualWeight * (1 - computed.actualFatPercent) : undefined;
    const trendFatMass = computed.trendFatPercent ? trendWeight * computed.trendFatPercent : undefined;
    const trendLeanMass = computed.trendFatPercent ? trendWeight * (1 - computed.trendFatPercent) : undefined;

    return {
      date,
      source: "computed", // Default source since it's not in the optimized response
      actualWeight,
      trendWeight,
      weightIsInterpolated: computed.weightIsInterpolated,
      fatIsInterpolated: computed.fatIsInterpolated,
      actualFatPercent: computed.actualFatPercent,
      trendFatPercent: computed.trendFatPercent,
      actualFatMass,
      actualLeanMass,
      trendFatMass,
      trendLeanMass,
    };
  });
}
