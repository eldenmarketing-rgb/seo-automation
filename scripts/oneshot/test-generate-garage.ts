import dotenv from 'dotenv';
dotenv.config();

import { dailyGenerate } from '../src/jobs/daily-generate.js';

// Override to only process garage
const origEntries = Object.entries;
const { sites } = await import('../config/sites.js');

// Temporarily filter sites to garage only
const allSites = { ...sites };
for (const key of Object.keys(sites)) {
  if (key !== 'garage') delete sites[key];
}

try {
  const result = await dailyGenerate(5);
  console.log('\n=== RESULT ===');
  console.log(JSON.stringify(result, null, 2));
} finally {
  // Restore
  Object.assign(sites, allSites);
}
