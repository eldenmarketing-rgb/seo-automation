import { google } from 'googleapis';
import fs from 'fs';

const key = JSON.parse(fs.readFileSync('/home/ubuntu/sites/seo-automation/config/gsc-service-account.json', 'utf8'));
const auth = new google.auth.JWT(key.client_email, null, key.private_key, [
  'https://www.googleapis.com/auth/webmasters.readonly',
]);
await auth.authorize();
const sc = google.searchconsole({ version: 'v1', auth });

const sites = await sc.sites.list({});
console.log('=== SITES ACCESSIBLES ===');
console.log(JSON.stringify(sites.data, null, 2));

const candidates = (sites.data.siteEntry || [])
  .map(s => s.siteUrl)
  .filter(u => u.includes('garage-perpignan'));
console.log('\n=== CANDIDATS GARAGE ===', candidates);

const d = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

for (const siteUrl of candidates) {
  console.log(`\n\n################ ${siteUrl} ################`);

  for (const [label, start, end] of [
    ['28 DERNIERS JOURS', d(30), d(2)],
    ['28 JOURS PRECEDENTS', d(58), d(31)],
    ['90 DERNIERS JOURS', d(92), d(2)],
  ]) {
    const tot = await sc.searchanalytics.query({
      siteUrl, requestBody: { startDate: start, endDate: end, dataState: 'all' },
    });
    console.log(`\n--- TOTAL ${label} (${start} → ${end}) ---`);
    console.log(JSON.stringify(tot.data.rows?.[0] || 'AUCUNE DONNEE'));
  }

  for (const dim of ['query', 'page', 'device', 'country']) {
    const r = await sc.searchanalytics.query({
      siteUrl,
      requestBody: { startDate: d(92), endDate: d(2), dimensions: [dim], rowLimit: 30, dataState: 'all' },
    });
    console.log(`\n--- TOP ${dim.toUpperCase()} (90j) ---`);
    for (const row of r.data.rows || []) {
      console.log(
        `${String(row.keys[0]).slice(0, 70).padEnd(72)} imp=${String(row.impressions).padStart(6)} clics=${String(row.clicks).padStart(4)} ctr=${(row.ctr * 100).toFixed(1).padStart(5)}% pos=${row.position.toFixed(1)}`
      );
    }
    if (!r.data.rows?.length) console.log('AUCUNE DONNEE');
  }
}
