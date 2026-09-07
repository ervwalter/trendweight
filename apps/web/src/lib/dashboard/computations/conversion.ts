import { LocalDate } from "@js-joda/core";
import type { Measurement, ProfileData } from "@/lib/core/interfaces";
import type { ApiComputedMeasurement } from "@/lib/api/types";
import { KG_TO_LBS } from "@/lib/core/weight-units";

/**
 * Converts backend computed measurements to frontend format with proper unit conversion
 */
export function convertMeasurements(computedMeasurements: ApiComputedMeasurement[], profile: ProfileData | null): Measurement[] {
  if (!computedMeasurements) return [];

  // Determine conversion factor (backend stores in kg, convert to lbs for non-metric users)
  const useMetric = profile?.useMetric ?? false;
  const conversionFactor = useMetric ? 1 : KG_TO_LBS;

  return computedMeasurements.map((computed: ApiComputedMeasurement) => {
    // Parse date string to LocalDate
    const date = LocalDate.parse(computed.date);

    // Convert weights from kg to user's preferred unit
    const actualWeight = computed.actualWeight * conversionFactor;
    const trendWeight = computed.trendWeight * conversionFactor;

    // Calculate fat/lean mass if fat data is available (already in correct units after weight conversion).
    // Check for presence rather than truthiness so a legitimate 0 is not dropped.
    const actualFatMass = computed.actualFatPercent != null ? actualWeight * computed.actualFatPercent : undefined;
    const actualLeanMass = computed.actualFatPercent != null ? actualWeight * (1 - computed.actualFatPercent) : undefined;

    // Use API-provided trend mass values (independent moving averages) with proper unit conversion
    const trendFatMass = computed.trendFatMass != null ? computed.trendFatMass * conversionFactor : undefined;
    const trendLeanMass = computed.trendLeanMass != null ? computed.trendLeanMass * conversionFactor : undefined;

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
