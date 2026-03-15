import dotenv from 'dotenv';
dotenv.config();

import { getGscSummary } from '../src/gsc/client.js';

async function test() {
  console.log('Testing GSC connection...\n');

  for (const siteKey of ['garage', 'vtc']) {
    try {
      console.log(`=== ${siteKey} ===`);
      const summary = await getGscSummary(siteKey, 7);
      console.log(`Impressions: ${summary.totalImpressions}`);
      console.log(`Clics: ${summary.totalClicks}`);
      console.log(`Position moy: ${summary.avgPosition.toFixed(1)}`);
      console.log(`Top 3: ${summary.pagesInTop3} | Top 10: ${summary.pagesInTop10} | #5-15: ${summary.pages5to15}`);
      if (summary.topQueries.length > 0) {
        console.log(`Top requête: "${summary.topQueries[0].query}" (#${summary.topQueries[0].position})`);
      }
      console.log('');
    } catch (e) {
      console.error(`${siteKey}: ${(e as Error).message}\n`);
    }
  }
}

test();
