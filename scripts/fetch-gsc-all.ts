import dotenv from 'dotenv';
dotenv.config();
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';

const auth = new GoogleAuth({
  keyFile: path.resolve(process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json'),
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const searchconsole = google.searchconsole({ version: 'v1', auth });

async function fetchSite(siteUrl: string, label: string) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 28);

  try {
    const res = await searchconsole.searchanalytics.query({
      siteUrl,
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 25,
      },
    });

    console.log('\n=== ' + label + ' ===');
    const rows = res.data.rows;
    if (!rows || rows.length === 0) {
      console.log('  Aucune donnée');
      return;
    }

    let totalClicks = 0;
    let totalImpressions = 0;
    for (const row of rows) {
      totalClicks += row.clicks || 0;
      totalImpressions += row.impressions || 0;
    }
    console.log('  Total: ' + totalClicks + ' clics / ' + totalImpressions + ' impressions');
    console.log('');
    console.log('  Pos  | Impr | Clics | CTR    | Requête');
    console.log('  -----|------|-------|--------|--------');

    const sorted = rows.sort((a, b) => (a.position || 99) - (b.position || 99));
    for (const row of sorted) {
      const pos = (row.position || 0).toFixed(1).padStart(4);
      const imp = String(row.impressions || 0).padStart(4);
      const clk = String(row.clicks || 0).padStart(5);
      const ctr = ((row.ctr || 0) * 100).toFixed(1).padStart(5) + '%';
      console.log('  ' + pos + ' | ' + imp + ' | ' + clk + ' | ' + ctr + ' | ' + row.keys![0]);
    }
  } catch (e) {
    console.log('\n=== ' + label + ' ===');
    console.log('  Erreur: ' + (e as Error).message);
  }
}

await fetchSite('sc-domain:garage-perpignan.fr', 'GARAGE');
await fetchSite('sc-domain:ideal-transport.fr', 'VTC');
await fetchSite('sc-domain:livraison-alcool-nuit-perpignan.com', 'RESTAURANT (Mon Sauveur)');
await fetchSite('sc-domain:ideo-car.fr', 'VOITURES (Ideo Car)');
await fetchSite('sc-domain:carrossier-pro.fr', 'CARROSSERIE');
await fetchSite('sc-domain:elayarituel.fr', 'MASSAGE');
