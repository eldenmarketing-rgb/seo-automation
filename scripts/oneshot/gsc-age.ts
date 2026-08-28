import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
const auth = new GoogleAuth({ keyFile: path.resolve("./config/gsc-service-account.json"), scopes: ["https://www.googleapis.com/auth/webmasters.readonly"] });
const sc = google.searchconsole({ version: "v1", auth });
(async () => {
  const endDate = new Date(); endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date("2025-01-01");
  const fmt = (d: Date) => d.toISOString().slice(0,10);
  const r = await sc.searchanalytics.query({ siteUrl: "sc-domain:ideal-transport.fr", requestBody: { startDate: fmt(startDate), endDate: fmt(endDate), dimensions: ["date"], rowLimit: 10000 }});
  const rows = r.data.rows || [];
  if (rows.length === 0) { console.log("Aucune donnée"); return; }
  console.log(`Première donnée: ${rows[0].keys?.[0]} | clics ${rows[0].clicks} | imp ${rows[0].impressions}`);
  console.log(`Dernière donnée: ${rows[rows.length-1].keys?.[0]} | clics ${rows[rows.length-1].clicks} | imp ${rows[rows.length-1].impressions}`);
  // Aggregate by month
  const byMonth: Record<string, { c: number; i: number }> = {};
  rows.forEach(r => {
    const m = (r.keys?.[0] || "").slice(0, 7);
    byMonth[m] = byMonth[m] || { c: 0, i: 0 };
    byMonth[m].c += r.clicks || 0;
    byMonth[m].i += r.impressions || 0;
  });
  console.log("\nEvolution mensuelle complète:");
  Object.entries(byMonth).sort().forEach(([m, d]) => console.log(`  ${m}: clics=${d.c} imp=${d.i}`));
})().catch(e => console.error(e));
