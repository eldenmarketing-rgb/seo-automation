/**
 * Bridge script: called by seo-dashboard via exec to run SERP analysis.
 * Usage: npx tsx scripts/serp-analyze.ts "carrosserie perpignan" [full|quick] [local|national]
 * Returns JSON on stdout. All logs redirected to stderr.
 */

// Redirect console.log to stderr so stdout stays clean JSON
console.log = (...args: unknown[]) => console.error(...args);

import { analyzeSerpForPrompt, quickSerpTerms } from '../src/serp/competitor-analysis.js';

const query = process.argv[2];
if (!query) {
  console.error('Usage: npx tsx scripts/serp-analyze.ts "query"');
  process.exit(1);
}

const mode = process.argv[3] || 'full'; // 'full' or 'quick'
// SERP vue depuis Perpignan (site local) ou la France (site national) —
// même distinction que le module Concurrents. Défaut national = ancien comportement.
const local = process.argv[4] === 'local';

async function main() {
  if (mode === 'quick') {
    const terms = await quickSerpTerms(query, { local });
    process.stdout.write(JSON.stringify({ terms }));
  } else {
    const insight = await analyzeSerpForPrompt(query, { local });
    process.stdout.write(JSON.stringify(insight));
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
