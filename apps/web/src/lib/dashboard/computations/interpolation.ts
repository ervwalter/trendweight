import { ChronoUnit } from "@js-joda/core";
import type { SourceMeasurement } from "../../core/interfaces";

/**
 * Interpolates missing weight measurements between existing measurements
 */
export function interpolateWeightMeasurements(sourceMeasurements: SourceMeasurement[]): SourceMeasurement[] {
  const missingDays: SourceMeasurement[] = [];
  let previous: SourceMeasurement | undefined = undefined;

  for (let i = 0; i < sourceMeasurements.length; i++) {
    const currentWeight = sourceMeasurements[i];

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
  return [...sourceMeasurements, ...missingDays].toSorted((a, b) => a.date.toString().localeCompare(b.date.toString()));
}

/**
 * Interpolates missing fat measurements between existing measurements
 */
export function interpolateFatMeasurements(fatSourceMeasurements: SourceMeasurement[]): SourceMeasurement[] {
  const missingFatDays: SourceMeasurement[] = [];
  let previous: SourceMeasurement | undefined = undefined;

  for (let ndx = 0; ndx < fatSourceMeasurements.length; ndx++) {
    const currentFat = fatSourceMeasurements[ndx];

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

  return [...fatSourceMeasurements, ...missingFatDays].toSorted((a, b) => a.date.toString().localeCompare(b.date.toString()));
}
