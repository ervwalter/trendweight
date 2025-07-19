import { LocalDate, LocalTime } from "@js-joda/core";
import type { ProfileData, SourceData, SourceMeasurement } from "../../core/interfaces";

/**
 * Converts raw source data into source measurements with proper date/time handling
 */
export function convertToSourceMeasurements(data: SourceData[], profile: ProfileData): SourceMeasurement[] {
  const dayStartOffset = profile.dayStartOffset || 0;
  const useMetric = profile.useMetric || false;
  const conversionFactor = useMetric ? 1 : 2.20462262;

  return data
    .map((sourceData) => {
      if (!sourceData.measurements) {
        return [];
      }
      return sourceData.measurements.map((sourceMeasurement) => {
        // Parse date and time to create LocalDateTime
        const localDateTime = LocalDate.parse(sourceMeasurement.date).atTime(LocalTime.parse(sourceMeasurement.time));

        // Apply dayStartOffset to determine which date this belongs to
        const adjustedDateTime = localDateTime.minusHours(dayStartOffset);

        return {
          date: adjustedDateTime.toLocalDate(),
          timestamp: adjustedDateTime, // Keep original for intra-day sorting
          source: sourceData.source,
          weight: sourceMeasurement.weight * conversionFactor, // Convert kg to lbs if needed
          fatRatio: sourceMeasurement.fatRatio,
          weightIsInterpolated: false,
        };
      });
    })
    .flat();
}
