import type { SourceMeasurement } from "@/lib/core/interfaces";

/**
 * Groups measurements by day and selects the first measurement of each day
 */
export function groupAndSelectFirstByDay(measurements: SourceMeasurement[]): SourceMeasurement[] {
  // Use reduce instead of Object.groupBy for better browser compatibility
  const groupedByDay = measurements.reduce<Record<string, SourceMeasurement[]>>((acc, m) => {
    const key = m.date.toString();
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(m);
    return acc;
  }, {});

  return Object.keys(groupedByDay)
    .map((key) => {
      const dayMeasurements = groupedByDay[key] || [];
      // Use sort() instead of toSorted() for better browser compatibility
      return [...dayMeasurements].sort((a, b) => a.timestamp.toString().localeCompare(b.timestamp.toString()))[0];
    })
    .filter(Boolean)
    .sort((a, b) => a.date.toString().localeCompare(b.date.toString()));
}

/**
 * Filters measurements that have fat ratio data and groups them by day
 */
export function filterAndGroupFatMeasurements(rawData: SourceMeasurement[]): SourceMeasurement[] {
  const fatMeasurements = rawData.filter((m) => m.fatRatio !== undefined);
  // Use sort() instead of toSorted() for better browser compatibility
  const sortedFatMeasurements = [...fatMeasurements].sort((a, b) => a.timestamp.toString().localeCompare(b.timestamp.toString()));

  return groupAndSelectFirstByDay(sortedFatMeasurements);
}
