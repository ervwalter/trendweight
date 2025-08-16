#!/usr/bin/env node

// Standalone script to compute demo measurements using existing frontend logic
// This will be run once to generate pre-computed demo data, then deleted

import { computeMeasurements } from './apps/web/src/lib/dashboard/computations/measurements.js';

// Demo source data (converted from the current demo-data.ts)
const demoProfile = {
  firstName: "Sample User",
  goalStart: "2024-01-01",
  goalWeight: 195,
  plannedPoundsPerWeek: -1,
  dayStartOffset: 3,
  useMetric: false,
  showCalories: true,
  sharingToken: undefined,
};

// Convert lbs to kg for storage
const lbsToKg = (lbs) => lbs * 0.453592;

// Demo measurements - exactly as in demo-data.ts
const demoMeasurementsRaw = [
  { date: "2011-03-23", time: "07:00:00", weight: 219.3, fatRatio: 0.3382 },
  { date: "2011-03-24", time: "07:00:00", weight: 218.1, fatRatio: 0.33649999999999997 },
  { date: "2011-03-25", time: "07:00:00", weight: 217.7, fatRatio: 0.33509999999999995 },
  { date: "2011-03-26", time: "07:00:00", weight: 218.4, fatRatio: 0.3312 },
  { date: "2011-03-27", time: "07:00:00", weight: 217.7, fatRatio: 0.3273 },
  { date: "2011-03-28", time: "07:00:00", weight: 216.7, fatRatio: 0.3325 },
  { date: "2011-03-29", time: "07:00:00", weight: 217.1, fatRatio: 0.32280000000000003 },
  { date: "2011-03-30", time: "07:00:00", weight: 216.5, fatRatio: 0.3155 },
  { date: "2011-03-31", time: "07:00:00", weight: 216.6, fatRatio: 0.3307 },
  { date: "2011-04-01", time: "07:00:00", weight: 215.5, fatRatio: 0.3154 },
  // ... (truncating for brevity, but would include all 184 measurements)
];

// Convert to the format expected by computeMeasurements
const demoMeasurements = demoMeasurementsRaw.map((m) => ({
  date: m.date,
  time: m.time,
  weight: lbsToKg(m.weight),
  ...(m.fatRatio !== undefined && { fatRatio: m.fatRatio }),
}));

// Create source data structure
const sourceData = [{
  source: "fitbit",
  lastUpdate: new Date().toISOString(),
  measurements: demoMeasurements,
}];

try {
  // Run the computation
  console.log('Computing measurements...');
  const computedMeasurements = computeMeasurements(sourceData, demoProfile);
  
  // Convert to ApiComputedMeasurement format
  const apiComputedMeasurements = computedMeasurements.map(measurement => ({
    date: measurement.date.toString(), // LocalDate to string
    actualWeight: Math.round(measurement.actualWeight * 1000) / 1000, // 3 decimal places
    trendWeight: Math.round(measurement.trendWeight * 1000) / 1000, // 3 decimal places
    weightIsInterpolated: measurement.weightIsInterpolated,
    fatIsInterpolated: measurement.fatIsInterpolated,
    actualFatPercent: measurement.actualFatPercent ? Math.round(measurement.actualFatPercent * 10000) / 10000 : undefined, // 4 decimal places
    trendFatPercent: measurement.trendFatPercent ? Math.round(measurement.trendFatPercent * 10000) / 10000 : undefined, // 4 decimal places
  }));
  
  // Output the results
  console.log('\n// Pre-computed demo measurements');
  console.log('const preComputedDemoMeasurements = ');
  console.log(JSON.stringify(apiComputedMeasurements, null, 2));
  console.log(';');
  
  console.log(`\nGenerated ${apiComputedMeasurements.length} computed measurements`);
  
} catch (error) {
  console.error('Error computing measurements:', error);
  process.exit(1);
}