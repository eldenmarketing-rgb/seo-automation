import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
const auth = new GoogleAuth({ keyFile: path.resolve("./config/gsc-service-account.json"), scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
const sc = google.searchconsole({ version: "v1", auth });
const SITE = "sc-domain:garage-perpignan.fr";
const fmt = (d: Date) => d.toISOString().slice(0,10);

(async () => {
  const endDate = new Date(); endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 90);

  console.log(`\n=== AUDIT GSC GARAGE PERPIGNAN ===`);
  console.log(`Période: ${fmt(startDate)} → ${fmt(endDate)} (90 derniers jours)\n`);

  // 1. Evolution mensuelle
  const yearStart = new Date("2025-10-01");
  const r = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: fmt(yearStart), endDate: fmt(endDate), dimensions: ["date"], rowLimit: 25000 }});
  const rows = r.data.rows || [];
  const byMonth: Record<string, { c: number; i: number }> = {};
  rows.forEach(x => {
    const m = (x.keys?.[0] || "").slice(0, 7);
    byMonth[m] = byMonth[m] || { c: 0, i: 0 };
    byMonth[m].c += x.clicks || 0;
    byMonth[m].i += x.impressions || 0;
  });
  console.log("Evolution mensuelle:");
  Object.entries(byMonth).sort().forEach(([m, d]) => console.log(`  ${m}: clics=${d.c} | impressions=${d.i} | ctr=${d.c && d.i ? (100*d.c/d.i).toFixed(1) : 0}%`));

  // 2. Top queries 90j
  const rq = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["query"], rowLimit: 50 }});
  const queries = rq.data.rows || [];
  console.log(`\nTop 30 queries (90j):`);
  queries.slice(0, 30).forEach(q => {
    console.log(`  [${(q.position||0).toFixed(1)}] ${q.keys?.[0]} | imp=${q.impressions} clics=${q.clicks} ctr=${((q.ctr||0)*100).toFixed(1)}%`);
  });
  const totalImp = queries.reduce((s, q) => s + (q.impressions || 0), 0);
  const totalClicks = queries.reduce((s, q) => s + (q.clicks || 0), 0);
  console.log(`\nTOTAL queries 90j: ${queries.length} queries | ${totalImp} imp | ${totalClicks} clics`);

  // 3. Top pages 90j
  const rp = await sc.searchanalytics.query({ siteUrl: SITE, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["page"], rowLimit: 100 }});
  const pages = rp.data.rows || [];
  console.log(`\nTop pages (90j) — ${pages.length} pages ayant reçu des impressions:`);
  pages.slice(0, 30).forEach(p => {
    const url = (p.keys?.[0] || "").replace("https://garage-perpignan.fr", "");
    console.log(`  [${(p.position||0).toFixed(1)}] ${url} | imp=${p.impressions} clics=${p.clicks}`);
  });

  // 4. Indexation — sitemaps
  console.log(`\n=== SITEMAPS ===`);
  try {
    const sm = await sc.sitemaps.list({ siteUrl: SITE });
    (sm.data.sitemap || []).forEach(s => console.log(`  ${s.path} | submitted=${s.lastSubmitted} | warnings=${s.warnings} | errors=${s.errors} | isPending=${s.isPending}`));
  } catch (e: any) { console.log(`  Erreur sitemap: ${e.message}`); }
})().catch(e => console.error(e));
