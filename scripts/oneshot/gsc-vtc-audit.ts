import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const sc = google.searchconsole({ version: "v1", auth });

const PROPS = ["sc-domain:ideal-transport.fr", "https://ideal-transport.fr/"];

async function try_(prop: string) {
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0,10);

  console.log(`\n=== ${prop} ===`);
  try {
    const smap = await sc.sitemaps.list({ siteUrl: prop });
    console.log("Sitemaps:");
    (smap.data.sitemap || []).forEach(s => console.log(`  ${s.path} — soumises ${s.contents?.[0]?.submitted} indexées ${s.contents?.[0]?.indexed} erreurs ${s.errors}`));
  } catch (e: any) { console.log("sitemaps err:", e.message); return false; }

  console.log("\nGlobal 90j (clicks / impressions):");
  try {
    const r = await sc.searchanalytics.query({ siteUrl: prop, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["date"], rowLimit: 1 }});
    const total = (r.data.rows || []).reduce((a, x) => ({ c: a.c + (x.clicks||0), i: a.i + (x.impressions||0)}), {c:0,i:0});
    const sumAll = await sc.searchanalytics.query({ siteUrl: prop, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), rowLimit: 1 }});
    const row = sumAll.data.rows?.[0];
    console.log(`  Période ${fmt(startDate)} → ${fmt(endDate)} | clics ${row?.clicks || 0} · impressions ${row?.impressions || 0} · CTR ${((row?.ctr||0)*100).toFixed(1)}% · pos ${row?.position?.toFixed(1)}`);
  } catch (e: any) { console.log("global err:", e.message); }

  console.log("\nTop 20 queries:");
  const q = await sc.searchanalytics.query({ siteUrl: prop, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["query"], rowLimit: 20 }});
  (q.data.rows || []).forEach(r => console.log(`  "${r.keys?.[0]}" pos ${r.position?.toFixed(1)} imp ${r.impressions} clics ${r.clicks} ctr ${((r.ctr||0)*100).toFixed(1)}%`));

  console.log("\nTop 15 pages:");
  const p = await sc.searchanalytics.query({ siteUrl: prop, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["page"], rowLimit: 15 }});
  (p.data.rows || []).forEach(r => console.log(`  ${r.keys?.[0]} imp ${r.impressions} clics ${r.clicks} pos ${r.position?.toFixed(1)}`));

  return true;
}

(async () => {
  for (const p of PROPS) { if (await try_(p)) return; }
})().catch(e => { console.error(e); process.exit(1); });
