import dotenv from 'dotenv';
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
      limit: 200,
      order_by: ['keyword_info.search_volume,desc'],
    }]),
  });

  const data = await response.json() as any;
  const items = data.tasks?.[0]?.result?.[0]?.items || [];
  const cost = data.cost || 0;
  console.log(`Total: ${items.length} results | Cost: $${cost.toFixed(4)}\n`);

  // Client-side filter
  const relevant = ['garage', 'vidange', 'entretien', 'frein', 'diagnostic', 'réparation', 'reparation',
    'mecani', 'voiture', 'auto', 'automobile', 'pneu', 'huile', 'moteur', 'embrayage', 'amortisseur',
    'courroie', 'climatisation', 'carrosserie', 'revision', 'révision', 'controle technique',
    'plaquette', 'disque', 'echappement', 'batterie', 'demarrage', 'démarrage', 'injection',
    'turbo', 'boite vitesse', 'direction', 'suspension', 'radiateur', 'alternateur', 'garagiste',
    'prix', 'tarif', 'devis', 'pas cher', 'urgent'];

  const filtered = items.filter((item: any) => {
    const kw = (item.keyword || '').toLowerCase();
    return relevant.some(r => kw.includes(r));
  });

  console.log(`Filtered: ${filtered.length} relevant keywords\n`);
  console.log('  #  | Mot-clé                                            | Volume   | CPC     | KD');
  console.log('-----|-----------------------------------------------------|----------|---------|----');

  for (let i = 0; i < Math.min(50, filtered.length); i++) {
    const item = filtered[i];
    const kw = item.keyword || '';
    const vol = item.keyword_info?.search_volume || 0;
    const cpc = item.keyword_info?.cpc ? `${item.keyword_info.cpc.toFixed(2)}€` : 'n/a';
    const kd = item.serp_info?.keyword_difficulty || 0;
    console.log(`${String(i + 1).padStart(4)} | ${kw.padEnd(51)} | ${String(vol).padStart(8)} | ${cpc.padStart(7)} | ${kd}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
