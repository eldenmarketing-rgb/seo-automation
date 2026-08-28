import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
});
const sc = google.searchconsole({ version: "v1", auth });
const SITE = "sc-domain:ideal-transport.fr";

const endDate = new Date();
endDate.setDate(endDate.getDate() - 3);
const startDate = new Date(endDate);
startDate.setDate(startDate.getDate() - 90);
const fmt = (d) => d.toISOString().slice(0, 10);

const CITIES = [
  "taxi-vtc-port-vendres", "taxi-vtc-banyuls-sur-mer", "taxi-vtc-cerbere",
  "taxi-vtc-collioure", "taxi-vtc-canet", "taxi-vtc-saint-cyprien",
  "taxi-vtc-le-barcares", "taxi-vtc-leucate", "taxi-vtc-argeles-sur-mer",
  "taxi-vtc-aeroport-perpignan", "taxi-vtc-aeroport-beziers", "taxi-vtc-aeroport-girona",
  "taxi-vtc-gare-perpignan", "taxi-vtc-amelie-les-bains", "taxi-vtc-vernet-les-bains",
  "taxi-vtc-perpignan", "taxi-vtc-thuir", "taxi-vtc-ille-sur-tet",
  "taxi-vtc-prades", "taxi-vtc-torreilles", "taxi-vtc-sainte-marie-la-mer",
  "taxi-vtc-gare-narbonne", "taxi-vtc-ceret", "taxi-vtc-font-romeu",
  "taxi-vtc-rivesaltes", "taxi-vtc-cabestany", "taxi-vtc-elne",
  "taxi-vtc-saint-esteve", "taxi-vtc-saint-laurent-de-la-salanque",
];

const rows = [];
for (const slug of CITIES) {
  const url = `https://ideal-transport.fr/${slug}`;
  try {
    const r = await sc.searchanalytics.query({
      siteUrl: SITE,
      requestBody: {
        startDate: fmt(startDate), endDate: fmt(endDate),
        dimensions: ["page"], rowLimit: 1,
        dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: url }] }],
      },
    });
    const row = r.data.rows?.[0];
    rows.push({
      slug, url,
      clicks: row?.clicks || 0,
      impressions: row?.impressions || 0,
      ctr: row?.ctr || 0,
      position: row?.position || null,
    });
  } catch (e) {
    rows.push({ slug, url, error: e.message });
  }
}

rows.sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

console.log(`\n=== Audit pages villes ideal-transport.fr — 90j (${fmt(startDate)} → ${fmt(endDate)}) ===\n`);
console.log("SLUG".padEnd(45), "IMP".padStart(6), "CLICKS".padStart(8), "CTR".padStart(7), "POS".padStart(7));
console.log("-".repeat(80));
let totalImp = 0, totalClicks = 0;
for (const r of rows) {
  if (r.error) { console.log(r.slug.padEnd(45), "ERROR:", r.error); continue; }
  totalImp += r.impressions; totalClicks += r.clicks;
  console.log(
    r.slug.padEnd(45),
    String(r.impressions).padStart(6),
    String(r.clicks).padStart(8),
    (r.ctr * 100).toFixed(1).padStart(6) + "%",
    (r.position ? r.position.toFixed(1) : "—").padStart(7),
  );
}
console.log("-".repeat(80));
console.log(`TOTAL`.padEnd(45), String(totalImp).padStart(6), String(totalClicks).padStart(8));

const zombies = rows.filter(r => !r.error && r.impressions < 5);
console.log(`\n→ ${zombies.length} pages zombies (<5 impressions/90j) :`);
zombies.forEach(r => console.log(`  ${r.slug}  imp=${r.impressions} clicks=${r.clicks}`));

const weak = rows.filter(r => !r.error && r.impressions >= 5 && r.impressions < 30);
console.log(`\n→ ${weak.length} pages faibles (5-30 impressions/90j) :`);
weak.forEach(r => console.log(`  ${r.slug}  imp=${r.impressions} clicks=${r.clicks} pos=${r.position?.toFixed(1)}`));
