#!/usr/bin/env tsx

// Standalone script to compute demo measurements using existing frontend logic
// This will be run once to generate pre-computed demo data, then deleted

import { computeMeasurements } from './apps/web/src/lib/dashboard/computations/measurements.js';
import { demoMeasurements, demoProfile } from './apps/web/src/lib/demo/demo-data.js';

// Create source data structure using existing demo data
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
  console.log('const preComputedDemoMeasurements: ApiComputedMeasurement[] = ');
  console.log(JSON.stringify(apiComputedMeasurements, null, 2));
  console.log(';');
  
  console.log(`\nGenerated ${apiComputedMeasurements.length} computed measurements`);
  
} catch (error) {
  console.error('Error computing measurements:', error);
  process.exit(1);
}