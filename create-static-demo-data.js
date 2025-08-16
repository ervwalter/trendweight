#!/usr/bin/env node

// Script to create fully static demo data with current dates

import { readFileSync, writeFileSync } from 'fs';

const resultsFile = 'computed-demo-results.txt';
const demoDataFile = 'apps/web/src/lib/demo/demo-data.ts';

try {
  // Read the computed results
  const resultsContent = readFileSync(resultsFile, 'utf8');
  
  // Extract the JSON array from the results
  const jsonStart = resultsContent.indexOf('[');
  const jsonEnd = resultsContent.lastIndexOf(']') + 1;
  const jsonArray = resultsContent.slice(jsonStart, jsonEnd);
  const measurements = JSON.parse(jsonArray);
  
  // Calculate date offset to make data end today
  const today = new Date();
  const originalLastDate = new Date("2011-11-03");
  const daysDiff = Math.floor((today.getTime() - originalLastDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Adjust all measurement dates
  const adjustedMeasurements = measurements.map(measurement => {
    const originalDate = new Date(measurement.date);
    const adjustedDate = new Date(originalDate);
    adjustedDate.setDate(adjustedDate.getDate() + daysDiff);
    
    return {
      ...measurement,
      date: adjustedDate.toISOString().split("T")[0]
    };
  });
  
  // Calculate adjusted goal start date
  const originalStartDate = new Date("2011-03-23");
  const adjustedStartDate = new Date(originalStartDate);
  adjustedStartDate.setDate(adjustedStartDate.getDate() + daysDiff);
  const goalStartDate = adjustedStartDate.toISOString().split("T")[0];
  
  // Create the new demo data content
  const newDemoDataContent = `import type { ApiComputedMeasurement, MeasurementsResponse, ProviderSyncStatus } from "../api/types";
import type { ProfileData } from "../core/interfaces";

// Demo profile data (with current dates)
export const demoProfile: ProfileData = {
  firstName: "Sample User",
  goalStart: "${goalStartDate}",
  goalWeight: 195, // Goal weight in lbs (user's units)
  plannedPoundsPerWeek: -1,
  dayStartOffset: 3, // 3 AM
  useMetric: false,
  showCalories: true,
  sharingToken: undefined,
};

// Demo provider status (all good)
export const demoProviderStatus: Record<string, ProviderSyncStatus> = {
  fitbit: {
    success: true,
  },
};

// Pre-computed demo measurements (with current dates)
const staticDemoMeasurements: ApiComputedMeasurement[] = ${JSON.stringify(adjustedMeasurements, null, 2)};

// Function to get demo data (now fully static)
export function getDemoData(): MeasurementsResponse {
  return {
    computedMeasurements: staticDemoMeasurements,
    providerStatus: demoProviderStatus,
    isMe: false,
  };
}

// Function to get demo profile (now fully static)
export function getDemoProfile(): ProfileData {
  return demoProfile;
}
`;
  
  // Write the new content
  writeFileSync(demoDataFile, newDemoDataContent);
  
  console.log('✅ Successfully created static demo data');
  console.log(`📊 ${adjustedMeasurements.length} measurements with dates ending ${adjustedMeasurements[adjustedMeasurements.length - 1].date}`);
  console.log(`📅 Goal start date: ${goalStartDate}`);
  
} catch (error) {
  console.error('❌ Error creating static demo data:', error.message);
  process.exit(1);
}