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

const TARGETS = [
  "taxi-vtc-cabestany", "taxi-vtc-rivesaltes", "taxi-vtc-elne", "taxi-vtc-saint-esteve",
  "taxi-vtc-saint-laurent-de-la-salanque", "taxi-vtc-font-romeu", "taxi-vtc-ceret",
  "taxi-vtc-leucate", "taxi-vtc-sainte-marie-la-mer", "taxi-vtc-argeles-sur-mer",
  "taxi-vtc-vernet-les-bains", "taxi-vtc-perpignan", "taxi-vtc-aeroport-beziers",
  "taxi-vtc-gare-perpignan",
];

for (const slug of TARGETS) {
  const url = `https://ideal-transport.fr/${slug}`;
  const r = await sc.searchanalytics.query({
    siteUrl: SITE,
    requestBody: {
      startDate: fmt(startDate), endDate: fmt(endDate),
      dimensions: ["query"], rowLimit: 8,
      dimensionFilterGroups: [{ filters: [{ dimension: "page", operator: "equals", expression: url }] }],
    },
  });
  console.log(`\n— ${slug} —`);
  const rows = r.data.rows || [];
  if (rows.length === 0) console.log("  (aucune requête)");
  rows.forEach(row => console.log(`  "${row.keys[0]}" imp=${row.impressions} clk=${row.clicks} pos=${row.position?.toFixed(1)}`));
}
