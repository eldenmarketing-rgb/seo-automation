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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 28);

  const fmtD = (d) => d.toISOString().split('T')[0];

  console.log(`=== Période : ${fmtD(startDate)} → ${fmtD(endDate)} (28 jours) ===\n`);

  // 1. Pages
  const resP = await sc.searchanalytics.query({
    siteUrl: 'sc-domain:carrossier-pro.fr',
    requestBody: {
      startDate: fmtD(startDate),
      endDate: fmtD(endDate),
      dimensions: ['page'],
      rowLimit: 100,
    },
  });

  console.log('=== PAGES (28j) ===');
  let totalImp = 0, totalClk = 0;
  if (resP.data.rows) {
    for (const r of resP.data.rows.sort((a,b) => (b.impressions||0) - (a.impressions||0))) {
      totalImp += r.impressions || 0;
      totalClk += r.clicks || 0;
      const pos = (r.position || 0).toFixed(1);
      console.log(`${pos.padStart(5)} | ${String(r.impressions).padStart(5)} imp | ${String(r.clicks).padStart(3)} clk | ${r.keys[0]}`);
    }
  } else console.log('aucune donnée');
  console.log(`\nTOTAL 28j : ${totalImp} impressions, ${totalClk} clics\n`);

  // 2. Requêtes
  const resQ = await sc.searchanalytics.query({
    siteUrl: 'sc-domain:carrossier-pro.fr',
    requestBody: {
      startDate: fmtD(startDate),
      endDate: fmtD(endDate),
      dimensions: ['query'],
      rowLimit: 50,
    },
  });
  console.log('=== REQUÊTES (28j) ===');
  if (resQ.data.rows) {
    for (const r of resQ.data.rows.sort((a,b) => (b.impressions||0) - (a.impressions||0))) {
      const pos = (r.position || 0).toFixed(1);
      console.log(`${pos.padStart(5)} | ${String(r.impressions).padStart(5)} imp | ${String(r.clicks).padStart(3)} clk | ${r.keys[0]}`);
    }
  }

  // 3. Indexation - récupérer toutes les pages avec impressions depuis janvier
  const startAll = new Date('2025-01-01');
  const resAll = await sc.searchanalytics.query({
    siteUrl: 'sc-domain:carrossier-pro.fr',
    requestBody: {
      startDate: fmtD(startAll),
      endDate: fmtD(endDate),
      dimensions: ['page'],
      rowLimit: 1000,
    },
  });
  console.log(`\n=== TOUTES PAGES AVEC IMPRESSIONS (depuis 2025-01-01) : ${resAll.data.rows?.length || 0} URLs ===`);
  if (resAll.data.rows) {
    const news = resAll.data.rows.filter(r => !r.keys[0].includes('-perpignan') || r.keys[0].includes('/perpignan'));
    console.log(`Dont format nouveau (/service/ville) : ${resAll.data.rows.filter(r => /\/[a-z-]+\/perpignan/.test(r.keys[0])).length}`);
    console.log(`Dont format ancien (-perpignan) : ${resAll.data.rows.filter(r => /-perpignan$/.test(r.keys[0])).length}`);
  }
}

main().catch(e => console.log('Erreur:', e.message));
