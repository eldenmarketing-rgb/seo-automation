import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'https://api.dataforseo.com/v3';

function getAuthHeader(): string {
  return 'Basic ' + Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64');
}

async function main() {
  // Step 1: Find Perpignan location code
  console.log('=== Searching for Perpignan location ===\n');
  const locResponse = await fetch(`${API_BASE}/serp/google/locations`, {
    method: 'GET',
    headers: { 'Authorization': getAuthHeader() },
  });
  const locData = await locResponse.json() as any;
  const allLocs = locData.tasks?.[0]?.result || [];
  const perpignanLocs = allLocs.filter((l: any) =>
    (l.location_name || '').toLowerCase().includes('perpignan')
  );

  if (perpignanLocs.length === 0) {
    console.log('No Perpignan location found in SERP locations.');
    console.log('Trying with location_name directly...\n');
  } else {
    console.log('Found locations:');
    for (const loc of perpignanLocs) {
      console.log(`  ${loc.location_code} | ${loc.location_name} | ${loc.location_type} | ${loc.country_iso_code}`);
    }
    console.log('');
  }

  // Step 2: Try keywords_for_keywords with the location
  const locationCode = perpignanLocs.length > 0 ? perpignanLocs[0].location_code : null;

  const body: any = {
    keywords: [
      "vidange voiture", "entretien auto", "garage mécanique",
      "réparation freins", "diagnostic auto", "climatisation voiture"
    ],
    language_code: "fr",
    sort_by: "search_volume",
    search_partners: false,
  };

  if (locationCode) {
    body.location_code = locationCode;
    console.log(`Using location_code: ${locationCode}\n`);
  } else {
    body.location_name = "Perpignan,Occitanie,France";
    console.log(`Using location_name: ${body.location_name}\n`);
  }

  const response = await fetch(`${API_BASE}/keywords_data/google_ads/keywords_for_keywords/live`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([body]),
  });

  const data = await response.json() as any;
  const cost = data.cost || 0;
  const statusMsg = data.tasks?.[0]?.status_message;
  const items = data.tasks?.[0]?.result || [];

  if (statusMsg && statusMsg !== 'Ok.') {
    console.log(`API status: ${statusMsg}`);
  }

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
