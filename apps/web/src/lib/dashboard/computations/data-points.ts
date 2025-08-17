import type { DataPoint, Measurement, Mode } from "@/lib/core/interfaces";

export const computeDataPoints = (mode: Mode, measurements: Measurement[]): DataPoint[] => {
  const propertyMap = {
    weight: "Weight",
    fatpercent: "FatPercent",
    fatmass: "FatMass",
    leanmass: "LeanMass",
  } as const;

  const property = propertyMap[mode];
  const interpolatedField = mode === "weight" ? "weightIsInterpolated" : "fatIsInterpolated";

  // Map all measurements to data points (including those with undefined values)
  const mapped = measurements.map(
    (m) =>
      ({
        date: m.date,
        source: m.source,
        actual: m[`actual${property}` as keyof Measurement] as number | undefined,
        trend: m[`trend${property}` as keyof Measurement] as number,
        isInterpolated: m[interpolatedField as keyof Measurement] as boolean,
      }) as DataPoint,
  );

  // Sort by date to ensure proper ordering
  mapped.sort((a, b) => a.date.toString().localeCompare(b.date.toString()));

  // Find the first and last indices with defined actual values
  let startIndex = 0;
  while (startIndex < mapped.length && mapped[startIndex].actual === undefined) {
    startIndex++;
  }

  let endIndex = mapped.length - 1;
  while (endIndex >= 0 && mapped[endIndex].actual === undefined) {
    endIndex--;
  }

  // Return the slice that excludes undefined values at the beginning and end
  return mapped.slice(startIndex, endIndex + 1);
};
