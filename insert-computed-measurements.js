#!/usr/bin/env node

// Script to insert pre-computed measurements into demo-data.ts

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
  
  // Read the demo data file
  const demoDataContent = readFileSync(demoDataFile, 'utf8');
  
  // Replace the placeholder with the actual computed measurements
  const startMarker = '// PLACEHOLDER_START_COMPUTED_MEASUREMENTS';
  const endMarker = '// PLACEHOLDER_END_COMPUTED_MEASUREMENTS';
  
  const startIndex = demoDataContent.indexOf(startMarker);
  const endIndex = demoDataContent.indexOf(endMarker) + endMarker.length;
  
  if (startIndex === -1 || endIndex === -1) {
    throw new Error('Placeholder markers not found in demo-data.ts');
  }
  
  const newContent = 
    demoDataContent.slice(0, startIndex) +
    startMarker + '\n' +
    'const preComputedDemoMeasurements: ApiComputedMeasurement[] = ' +
    jsonArray + ';\n' +
    endMarker +
    demoDataContent.slice(endIndex);
  
  // Write the updated content back
  writeFileSync(demoDataFile, newContent);
  
  console.log('✅ Successfully inserted computed measurements into demo-data.ts');
  console.log(`📊 Inserted ${JSON.parse(jsonArray).length} pre-computed measurements`);
  
} catch (error) {
  console.error('❌ Error inserting computed measurements:', error.message);
  process.exit(1);
}