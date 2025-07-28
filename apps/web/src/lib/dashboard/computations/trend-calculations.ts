import type { Measurement, SourceMeasurement } from "../../core/interfaces";

const TREND_SMOOTHING_FACTOR = 0.1;

/**
 * Computes weight trends from source measurements
 */
export function computeWeightTrends(sourceMeasurements: SourceMeasurement[]): Measurement[] {
  let trendWeight = 0;
  const measurements: Measurement[] = [];

  for (let i = 0; i < sourceMeasurements.length; i++) {
    const sourceMeasurement = sourceMeasurements[i];
    const weight = sourceMeasurement.weight;

    if (i === 0) {
      trendWeight = weight;
    } else {
      trendWeight = trendWeight + TREND_SMOOTHING_FACTOR * (weight - trendWeight);
    }

    measurements.push({
      date: sourceMeasurement.date,
      source: sourceMeasurement.source,
      actualWeight: sourceMeasurement.weight,
      trendWeight: trendWeight,
      weightIsInterpolated: sourceMeasurement.weightIsInterpolated || false,
      fatIsInterpolated: false, // Will be set correctly when processing fat data
    });
  }

  return measurements;
}

/**
 * Computes fat trends and updates measurements with fat data
 */
export function computeFatTrends(fatSourceMeasurements: SourceMeasurement[], measurements: Measurement[]): Measurement[] {
  const measurementsByDate = Object.fromEntries(measurements.map((m) => [m.date.toString(), m]));
  const additionalMeasurements: Measurement[] = [];

  let trendFatRatio = 0;
  let trendFatMass = 0;
  let trendLeanMass = 0;

  for (let ndx = 0; ndx < fatSourceMeasurements.length; ndx++) {
    const sourceMeasurement = fatSourceMeasurements[ndx];
    const weight = sourceMeasurement.weight;
    const fatRatio = sourceMeasurement.fatRatio!;
    const fatMass = weight * fatRatio;
    const leanMass = weight - fatMass;

    if (ndx === 0) {
      trendFatRatio = fatRatio;
      trendFatMass = fatMass;
      trendLeanMass = leanMass;
    } else {
      trendFatRatio = trendFatRatio + TREND_SMOOTHING_FACTOR * (fatRatio - trendFatRatio);
      trendFatMass = trendFatMass + TREND_SMOOTHING_FACTOR * (fatMass - trendFatMass);
      trendLeanMass = trendLeanMass + TREND_SMOOTHING_FACTOR * (leanMass - trendLeanMass);
    }

    const measurement = measurementsByDate[sourceMeasurement.date.toString()];

    if (measurement) {
      // Update existing measurement with fat data
      measurement.actualFatPercent = fatRatio;
      measurement.actualFatMass = fatMass;
      measurement.actualLeanMass = leanMass;
      measurement.trendFatPercent = trendFatRatio;
      measurement.trendFatMass = trendFatMass;
      measurement.trendLeanMass = trendLeanMass;
      measurement.fatIsInterpolated = sourceMeasurement.fatRatioIsInterpolated || false;
    } else {
      // This is an interpolated fat day that doesn't have a corresponding weight measurement
      additionalMeasurements.push({
        date: sourceMeasurement.date,
        source: sourceMeasurement.source,
        actualWeight: sourceMeasurement.weight,
        trendWeight: sourceMeasurement.weight, // Use the interpolated weight as trend too
        weightIsInterpolated: true,
        actualFatPercent: fatRatio,
        actualFatMass: fatMass,
        actualLeanMass: leanMass,
        trendFatPercent: trendFatRatio,
        trendFatMass: trendFatMass,
        trendLeanMass: trendLeanMass,
        fatIsInterpolated: sourceMeasurement.fatRatioIsInterpolated || false,
      });
    }
  }

  // Combine original measurements with additional ones and re-sort
  // Use sort() instead of toSorted() for better browser compatibility
  return [...measurements, ...additionalMeasurements].sort((a, b) => a.date.toString().localeCompare(b.date.toString()));
}
