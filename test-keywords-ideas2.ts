import { getKeywordIdeas } from './src/keywords/dataforseo.js';
import dotenv from 'dotenv';
import * as logger from './src/utils/logger.js';

dotenv.config();

const API_BASE = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
}

async function main() {
  const seeds = [
    "vidange voiture",
    "garage automobile",
    "entretien voiture",
    "réparation auto",
    "frein voiture",
    "diagnostic auto"
  ];

  // Call directly with keyword filters to get relevant long tail
  const response = await fetch(`${API_BASE}/dataforseo_labs/google/keyword_ideas/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: seeds,
      location_code: 2250,
      language_code: 'fr',
      include_serp_info: true,
      include_seed_keyword: true,
      limit: 100,
      order_by: ['keyword_info.search_volume,desc'],
      filters: [
        ['keyword_info.search_volume', '>', 0],
        'and',
        [
          ['keyword_data.keyword', 'contains', 'garage'],
          'or',
          ['keyword_data.keyword', 'contains', 'vidange'],
          'or',
          ['keyword_data.keyword', 'contains', 'entretien'],
          'or',
          ['keyword_data.keyword', 'contains', 'frein'],
          'or',
          ['keyword_data.keyword', 'contains', 'diagnostic'],
          'or',
          ['keyword_data.keyword', 'contains', 'réparation'],
          'or',
          ['keyword_data.keyword', 'contains', 'reparation'],
          'or',
          ['keyword_data.keyword', 'contains', 'mecani'],
          'or',
          ['keyword_data.keyword', 'contains', 'voiture'],
          'or',
          ['keyword_data.keyword', 'contains', 'auto '],
          'or',
          ['keyword_data.keyword', 'contains', 'automobile'],
        ]
      ],
    }]),
  });

  const data = await response.json() as any;

  if (data.status_code !== 20000) {
    console.error('API error:', data.status_message);
    // Try without nested filters
    console.log('\nRetrying with simple filter...\n');

    const response2 = await fetch(`${API_BASE}/dataforseo_labs/google/keyword_ideas/live`, {
      method: 'POST',
      headers: {
        'Authorization': getAuthHeader(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{
        keywords: seeds,
        location_code: 2250,
        language_code: 'fr',
        include_serp_info: true,
        include_seed_keyword: true,
        limit: 200,
        order_by: ['keyword_info.search_volume,desc'],
        filters: [
          ['keyword_info.search_volume', '>', 0],
        ],
      }]),
    });

    const data2 = await response2.json() as any;
    const items = data2.tasks?.[0]?.result?.[0]?.items || [];
    const cost = data2.cost || 0;
    console.log(`Got ${items.length} results, cost: $${cost.toFixed(4)}\n`);

    // Filter client-side for relevant keywords
    const relevant = ['garage', 'vidange', 'entretien', 'frein', 'diagnostic', 'réparation', 'reparation',
      'mecani', 'voiture', 'auto', 'automobile', 'pneu', 'huile', 'moteur', 'embrayage', 'amortisseur',
      'courroie', 'climatisation', 'carrosserie', 'revision', 'révision', 'controle technique',
      'plaquette', 'disque', 'echappement', 'batterie', 'demarrage', 'démarrage', 'injection',
      'turbo', 'boite vitesse', 'direction', 'suspension', 'radiateur', 'alternateur'];

    const filtered = items.filter((item: any) => {
      const kw = (item.keyword || '').toLowerCase();
      return relevant.some(r => kw.includes(r));
    });

    console.log(`Filtered to ${filtered.length} relevant keywords\n`);
    console.log('  #  | Mot-clé                                            | Volume   | CPC     | KD');
    console.log('-----|-----------------------------------------------------|----------|---------|----');

    for (let i = 0; i < Math.min(50, filtered.length); i++) {
      const item = filtered[i];
      const kw = item.keyword || '';
      const vol = item.keyword_info?.search_volume || 0;
      const cpc = item.keyword_info?.cpc ? `${item.keyword_info.cpc.toFixed(2)}€` : 'n/a';
      const kd = item.keyword_info?.keyword_difficulty || item.serp_info?.keyword_difficulty || 0;
      console.log(`${String(i + 1).padStart(4)} | ${kw.padEnd(51)} | ${String(vol).padStart(8)} | ${cpc.padStart(7)} | ${kd}`);
    }
    return;
  }

  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const cost = data.cost || 0;
  console.log(`Got ${items.length} results, cost: $${cost.toFixed(4)}\n`);

  console.log('  #  | Mot-clé                                            | Volume   | CPC     | KD');
  console.log('-----|-----------------------------------------------------|----------|---------|----');

  for (let i = 0; i < Math.min(50, items.length); i++) {
    const item = items[i];
    const kw = item.keyword || '';
    const vol = item.keyword_info?.search_volume || 0;
    const cpc = item.keyword_info?.cpc ? `${item.keyword_info.cpc.toFixed(2)}€` : 'n/a';
    const kd = item.keyword_info?.keyword_difficulty || item.serp_info?.keyword_difficulty || 0;
    console.log(`${String(i + 1).padStart(4)} | ${kw.padEnd(51)} | ${String(vol).padStart(8)} | ${cpc.padStart(7)} | ${kd}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
