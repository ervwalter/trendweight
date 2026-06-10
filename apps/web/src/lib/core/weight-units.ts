// Conversion factor between kilograms and pounds. The API always speaks kilograms;
// display-unit conversion happens client-side.
export const KG_TO_LBS = 2.20462262;

/** Converts a weight in the user's display units to kilograms for the API. */
export function toKg(value: number, useMetric: boolean): number {
  return useMetric ? value : value / KG_TO_LBS;
}

/** Converts a weight in kilograms to the user's display units. */
export function fromKg(value: number, useMetric: boolean): number {
  return useMetric ? value : value * KG_TO_LBS;
}
