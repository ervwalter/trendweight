import { ChronoUnit } from "@js-joda/core";
import type { SourceMeasurement } from "@/lib/core/interfaces";

/**
 * Interpolates missing weight measurements between existing measurements
 */
export function interpolateWeightMeasurements(sourceMeasurements: SourceMeasurement[]): SourceMeasurement[] {
  // Sort measurements by date first to ensure correct interpolation
  const sortedMeasurements = [...sourceMeasurements].sort((a, b) => a.date.toString().localeCompare(b.date.toString()));

  const missingDays: SourceMeasurement[] = [];
  let previous: SourceMeasurement | undefined = undefined;

  for (let i = 0; i < sortedMeasurements.length; i++) {
    const currentWeight = sortedMeasurements[i];

    if (previous) {
      const daysBetween = previous.date.until(currentWeight.date, ChronoUnit.DAYS);

      if (daysBetween > 1) {
        const changePerDay = (currentWeight.weight - previous.weight) / daysBetween;
        let weight = previous.weight;

        for (let date = previous.date.plusDays(1); date.isBefore(currentWeight.date); date = date.plusDays(1)) {
          weight += changePerDay;
          missingDays.push({
            date,
            weight,
            timestamp: date.atTime(23, 59, 59),
            source: "interpolated",
            weightIsInterpolated: true,
          });
        }
      } else {
        currentWeight.weightIsInterpolated = false;
      }
    }

    previous = currentWeight;
  }

  // Add in the missing days and re-sort
  // Use sort() instead of toSorted() for better browser compatibility
  return [...sortedMeasurements, ...missingDays].sort((a, b) => a.date.toString().localeCompare(b.date.toString()));
}

/**
 * Interpolates missing fat measurements between existing measurements
 */
export function interpolateFatMeasurements(fatSourceMeasurements: SourceMeasurement[]): SourceMeasurement[] {
  // Sort measurements by date first to ensure correct interpolation
  const sortedMeasurements = [...fatSourceMeasurements].sort((a, b) => a.date.toString().localeCompare(b.date.toString()));

  const missingFatDays: SourceMeasurement[] = [];
  let previous: SourceMeasurement | undefined = undefined;

  for (let ndx = 0; ndx < sortedMeasurements.length; ndx++) {
    const currentFat = sortedMeasurements[ndx];

    if (previous) {
      const daysBetween = previous.date.until(currentFat.date, ChronoUnit.DAYS);

      if (daysBetween > 1) {
        const fatChangePerDay = (currentFat.fatRatio! - previous.fatRatio!) / daysBetween;
        const weightChangePerDay = (currentFat.weight - previous.weight) / daysBetween;
        let fatRatio = previous.fatRatio!;
        let weight = previous.weight;

        for (let date = previous.date.plusDays(1); date.isBefore(currentFat.date); date = date.plusDays(1)) {
          fatRatio += fatChangePerDay;
          weight += weightChangePerDay;
          missingFatDays.push({
            date: date,
            source: "interpolated",
            weight: weight,
            weightIsInterpolated: true,
            timestamp: date.atStartOfDay(),
            fatRatio: fatRatio,
            fatRatioIsInterpolated: true,
          });
        }
      }
    }

    previous = currentFat;
  }

  // Use sort() instead of toSorted() for better browser compatibility
  return [...sortedMeasurements, ...missingFatDays].sort((a, b) => a.date.toString().localeCompare(b.date.toString()));
}
