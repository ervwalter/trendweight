import { ChronoUnit, LocalDate } from "@js-joda/core";
import type { DataPoint, Delta, Measurement, Mode } from "@/lib/core/interfaces";

export const computeDeltas = (_mode: Mode, dataPoints: DataPoint[]): Delta[] => {
  const deltas: Delta[] = [];

  if (dataPoints.length === 0) {
    return deltas;
  }

  // Clone and reverse the array
  const points = [...dataPoints].reverse();
  if (points.length === 0) {
    return deltas;
  }

  const today = LocalDate.now();
  const daysSinceMostRecent = points[0].date.until(today, ChronoUnit.DAYS);

  // Not enough recent readings
  if (daysSinceMostRecent > 2 || points.length <= 1) {
    return deltas;
  }

  // Round to 1 decimal place to match UI display formatting
  const mostRecentTrendValue = Math.round(points[0].trend * 10) / 10;
  let index: number;

  // Yesterday
  if (daysSinceMostRecent <= 1 && points.length > 1) {
    const comparisonDataPoint = points[1];
    if (comparisonDataPoint.date.until(points[0].date, ChronoUnit.DAYS) === 1) {
      const comparisonTrendValue = Math.round(comparisonDataPoint.trend * 10) / 10;
      deltas.push({
        period: 1,
        description: "yesterday",
        delta: mostRecentTrendValue - comparisonTrendValue,
      });
    }
  }

  // A week ago
  const targetDate7 = points[0].date.minusDays(7);
  index = points.findIndex((m) => m.date.equals(targetDate7));
  // Needs to be at least 4 readings between now and a week ago for a valid trend comparison
  if (index >= 4) {
    const comparisonTrendValue = Math.round(points[index].trend * 10) / 10;
    deltas.push({
      period: 7,
      description: "last week",
      delta: mostRecentTrendValue - comparisonTrendValue,
    });
  }

  // Two weeks ago
  const targetDate14 = points[0].date.minusDays(14);
  index = points.findIndex((m) => m.date.equals(targetDate14));
  if (index >= 9) {
    const comparisonTrendValue = Math.round(points[index].trend * 10) / 10;
    deltas.push({
      period: 14,
      description: "two weeks ago",
      delta: mostRecentTrendValue - comparisonTrendValue,
    });
  }

  // A month ago
  const targetDate28 = points[0].date.minusDays(28);
  index = points.findIndex((m) => m.date.equals(targetDate28));
  if (index >= 19) {
    const comparisonTrendValue = Math.round(points[index].trend * 10) / 10;
    deltas.push({
      period: 28,
      description: "a month ago",
      delta: mostRecentTrendValue - comparisonTrendValue,
    });
  }

  return deltas;
};

export const computeWeightSlope = (measurements: Measurement[]): number => {
  if (measurements.length === 0) {
    return 0;
  }

  const values = measurements
    .slice(-14)
    .filter((m) => m.trendWeight != null)
    .map((m, index) => ({ x: index, y: m.trendWeight }));

  if (values.length < 2) {
    return 0;
  }

  return calculateSlope(values);
};

export const computeActiveSlope = (mode: Mode, dataPoints: DataPoint[]): number => {
  if (dataPoints.length === 0) {
    return 0;
  }

  // Use 28 data points for fat/lean modes, 14 for weight
  const pointCount = mode === "weight" ? 14 : 28;

  const values = dataPoints.slice(-pointCount).map((m, index) => ({ x: index, y: m.trend }));

  if (values.length < 2) {
    return 0;
  }

  return calculateSlope(values);
};

// Helper function to calculate slope using least squares regression
function calculateSlope(points: { x: number; y: number }[]): number {
  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXY += point.x * point.y;
    sumX2 += point.x * point.x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  return slope;
}
