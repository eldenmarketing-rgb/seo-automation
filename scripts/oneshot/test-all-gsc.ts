import { getGscSummary } from '../src/gsc/client.js';

async function main() {
  for (const site of ['garage', 'carrosserie', 'massage', 'vtc', 'voitures', 'restaurant']) {
    try {
      const s = await getGscSummary(site, 28);
      console.log(site + ': ' + s.totalImpressions + ' impressions, ' + s.totalClicks + ' clics, pos moy ' + s.avgPosition.toFixed(1) + ', top10: ' + s.pagesInTop10);
      if (s.topQueries[0]) console.log('  → top: "' + s.topQueries[0].query + '" #' + s.topQueries[0].position.toFixed(1));
    } catch(e: any) {
      console.error(site + ': ERREUR - ' + e.message);
    }
  }
}
main();
