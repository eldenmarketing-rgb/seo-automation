import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
}

async function main() {
  const response = await fetch(`${API_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{
      keywords: [
        "vidange voiture",
        "entretien auto",
        "garage mécanique",
        "réparation freins",
        "diagnostic auto",
        "climatisation voiture"
      ],
      location_code: 2250,
      language_code: "fr",
      sort_by: "search_volume",
      search_partners: false,
    }]),
  });

  const data = await response.json() as any;
  const cost = data.cost || 0;
  const items = data.tasks?.[0]?.result || [];

  console.log(`Total: ${items.length} keywords | Cost: $${cost.toFixed(4)}\n`);
  console.log('  #  | Mot-clé                                            | Volume   |  CPC    | Comp');
  console.log('-----|-----------------------------------------------------|----------|---------|----------');

  for (let i = 0; i < Math.min(50, items.length); i++) {
    const item = items[i];
    const kw = item.keyword || '';
    const vol = item.search_volume || 0;
    const cpc = item.cpc ? `${item.cpc.toFixed(2)}€` : 'n/a';
    const comp = item.competition || 'n/a';
    console.log(`${String(i + 1).padStart(4)} | ${kw.padEnd(51)} | ${String(vol).padStart(8)} | ${cpc.padStart(7)} | ${comp}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
