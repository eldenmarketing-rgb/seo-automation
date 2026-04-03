import dotenv from 'dotenv';
dotenv.config();
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import path from 'path';

async function main() {
  const auth = new GoogleAuth({
    keyFile: path.resolve(process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const sc = google.searchconsole({ version: 'v1', auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date('2025-01-01');

  try {
    const res = await sc.searchanalytics.query({
      siteUrl: 'sc-domain:carrossier-pro.fr',
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['page'],
        rowLimit: 100,
      },
    });

    console.log('=== PAGES avec impressions ===');
    if (res.data.rows) {
      for (const row of res.data.rows) {
        const pos = (row.position || 0).toFixed(1);
        console.log(pos.padStart(5) + ' | ' + String(row.impressions).padStart(5) + ' imp | ' + String(row.clicks).padStart(3) + ' clk | ' + row.keys![0]);
      }
    } else {
      console.log('Aucune donnée page');
    }

    const res2 = await sc.searchanalytics.query({
      siteUrl: 'sc-domain:carrossier-pro.fr',
      requestBody: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        dimensions: ['query'],
        rowLimit: 50,
      },
    });

    console.log('\n=== REQUÊTES ===');
    if (res2.data.rows) {
      for (const row of res2.data.rows.sort((a, b) => (b.impressions || 0) - (a.impressions || 0))) {
        const pos = (row.position || 0).toFixed(1);
        console.log(pos.padStart(5) + ' | ' + String(row.impressions).padStart(5) + ' imp | ' + String(row.clicks).padStart(3) + ' clk | ' + row.keys![0]);
      }
    } else {
      console.log('Aucune donnée requête');
    }
  } catch (e) {
    console.log('Erreur GSC:', (e as Error).message);
  }
}

main();
