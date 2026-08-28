import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const sc = google.searchconsole({ version: "v1", auth });
const PROP = "sc-domain:ideal-transport.fr";

(async () => {
  const endDate = new Date(); endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate); startDate.setDate(startDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0,10);

  console.log(`Période: ${fmt(startDate)} → ${fmt(endDate)}\n`);

  // Top 50 queries
  console.log("=== TOP 50 QUERIES (90j) ===");
  const q = await sc.searchanalytics.query({ siteUrl: PROP, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["query"], rowLimit: 50 }});
  (q.data.rows || []).forEach(r => console.log(`  pos ${r.position?.toFixed(1).padStart(5)} imp ${String(r.impressions).padStart(4)} clics ${String(r.clicks).padStart(3)} ctr ${((r.ctr||0)*100).toFixed(1).padStart(4)}%  "${r.keys?.[0]}"`));

  // Toutes les pages
  console.log("\n=== TOUTES PAGES AVEC IMPRESSIONS (90j) ===");
  const p = await sc.searchanalytics.query({ siteUrl: PROP, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["page"], rowLimit: 100 }});
  (p.data.rows || []).forEach(r => console.log(`  imp ${String(r.impressions).padStart(4)} clics ${String(r.clicks).padStart(3)} pos ${r.position?.toFixed(1).padStart(5)}  ${r.keys?.[0]}`));

  // Courbe mensuelle
  console.log("\n=== ÉVOLUTION MENSUELLE ===");
  const m = await sc.searchanalytics.query({ siteUrl: PROP, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["date"], rowLimit: 1000 }});
  const byMonth: Record<string, { c: number; i: number }> = {};
  (m.data.rows || []).forEach(r => {
    const month = (r.keys?.[0] || "").slice(0, 7);
    byMonth[month] = byMonth[month] || { c: 0, i: 0 };
    byMonth[month].c += r.clicks || 0;
    byMonth[month].i += r.impressions || 0;
  });
  Object.entries(byMonth).sort().forEach(([m, d]) => console.log(`  ${m} · clics ${d.c} · imp ${d.i}`));

  // Pays / appareil
  console.log("\n=== PAR APPAREIL ===");
  const dev = await sc.searchanalytics.query({ siteUrl: PROP, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["device"], rowLimit: 10 }});
  (dev.data.rows || []).forEach(r => console.log(`  ${r.keys?.[0]} · clics ${r.clicks} · imp ${r.impressions} · pos ${r.position?.toFixed(1)}`));

  console.log("\n=== PAR PAYS ===");
  const co = await sc.searchanalytics.query({ siteUrl: PROP, requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["country"], rowLimit: 5 }});
  (co.data.rows || []).forEach(r => console.log(`  ${r.keys?.[0]} · clics ${r.clicks} · imp ${r.impressions}`));

  // Indexation inspection
  console.log("\n=== INSPECTION INDEXATION (top pages sitemap) ===");
  const urlsToInspect = [
    "https://ideal-transport.fr/",
    "https://ideal-transport.fr/taxi-vtc-perpignan",
    "https://ideal-transport.fr/taxi-vtc-canet",
    "https://ideal-transport.fr/taxi-vtc-aeroport-perpignan",
    "https://ideal-transport.fr/destinations",
  ];
  for (const u of urlsToInspect) {
    try {
      const insp = await sc.urlInspection.index.inspect({ requestBody: { inspectionUrl: u, siteUrl: PROP }});
      const idx = insp.data.inspectionResult?.indexStatusResult;
      console.log(`  ${u}`);
      console.log(`    verdict: ${idx?.verdict} | coverage: ${idx?.coverageState}`);
      console.log(`    robots: ${idx?.robotsTxtState} | indexing: ${idx?.indexingState} | lastCrawl: ${idx?.lastCrawlTime}`);
      console.log(`    googleCanonical: ${idx?.googleCanonical}`);
      console.log(`    userCanonical:   ${idx?.userCanonical}`);
    } catch (e: any) {
      console.log(`  ${u} — err: ${e.message}`);
    }
  }
})().catch(e => { console.error(e); process.exit(1); });
