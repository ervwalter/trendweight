import type { SourceMeasurement } from "../../core/interfaces";

/**
 * Groups measurements by day and selects the first measurement of each day
 */
export function groupAndSelectFirstByDay(measurements: SourceMeasurement[]): SourceMeasurement[] {
  const groupedByDay = Object.groupBy(measurements, (m) => m.date.toString()) as Record<string, SourceMeasurement[]>;

  return Object.keys(groupedByDay)
    .map((key) => {
      const dayMeasurements = groupedByDay[key] || [];
      return dayMeasurements.toSorted((a, b) => a.timestamp.toString().localeCompare(b.timestamp.toString()))[0];
    })
    .filter(Boolean)
    .toSorted((a, b) => a.date.toString().localeCompare(b.date.toString()));
}

/**
 * Filters measurements that have fat ratio data and groups them by day
 */
export function filterAndGroupFatMeasurements(rawData: SourceMeasurement[]): SourceMeasurement[] {
  const fatMeasurements = rawData.filter((m) => m.fatRatio !== undefined).toSorted((a, b) => a.timestamp.toString().localeCompare(b.timestamp.toString()));

  return groupAndSelectFirstByDay(fatMeasurements);
}
