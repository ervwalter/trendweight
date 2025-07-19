import type { Measurement, ProfileData, SourceData } from "../../core/interfaces";
import { convertToSourceMeasurements } from "./conversion";
import { filterAndGroupFatMeasurements, groupAndSelectFirstByDay } from "./grouping";
import { interpolateFatMeasurements, interpolateWeightMeasurements } from "./interpolation";
import { computeFatTrends, computeWeightTrends } from "./trend-calculations";

export const computeMeasurements = (data: SourceData[], profile: ProfileData): Measurement[] => {
  // Step 1: Convert raw data to source measurements with proper date/time handling
  const rawData = convertToSourceMeasurements(data, profile);

  // Step 2: Group by day and select first measurement of each day
  let sourceMeasurements = groupAndSelectFirstByDay(rawData);

  // Step 3: Interpolate missing weight measurements
  sourceMeasurements = interpolateWeightMeasurements(sourceMeasurements);

  // Step 4: Compute weight trends
  let measurements = computeWeightTrends(sourceMeasurements);

  // Step 5: Process fat measurements if available
  let fatSourceMeasurements = filterAndGroupFatMeasurements(rawData);

  if (fatSourceMeasurements.length > 0) {
    // Step 6: Interpolate missing fat measurements
    fatSourceMeasurements = interpolateFatMeasurements(fatSourceMeasurements);

    // Step 7: Compute fat trends and update measurements
    measurements = computeFatTrends(fatSourceMeasurements, measurements);
  }

  return measurements;
};
