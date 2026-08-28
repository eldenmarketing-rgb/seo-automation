import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters"],
});
const sc = google.searchconsole({ version: "v1", auth });
const SITE = "sc-domain:ideal-transport.fr";

const ZOMBIES = [
  "taxi-vtc-port-vendres", "taxi-vtc-banyuls-sur-mer", "taxi-vtc-cerbere",
  "taxi-vtc-collioure", "taxi-vtc-canet", "taxi-vtc-saint-cyprien",
  "taxi-vtc-le-barcares", "taxi-vtc-aeroport-perpignan", "taxi-vtc-aeroport-girona",
  "taxi-vtc-amelie-les-bains", "taxi-vtc-thuir", "taxi-vtc-ille-sur-tet",
  "taxi-vtc-prades", "taxi-vtc-torreilles", "taxi-vtc-gare-narbonne",
  "taxi-vtc-cabestany", "taxi-vtc-rivesaltes", "taxi-vtc-elne", "taxi-vtc-saint-esteve",
];

console.log(`Inspection ${ZOMBIES.length} URLs...\n`);
console.log("SLUG".padEnd(38), "VERDICT".padEnd(20), "COVERAGE".padEnd(25), "LASTCRAWL");
console.log("-".repeat(110));

for (const slug of ZOMBIES) {
  const url = `https://ideal-transport.fr/${slug}`;
  try {
    const r = await sc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl: SITE, languageCode: "fr-FR" },
    });
    const idx = r.data.inspectionResult?.indexStatusResult;
    const verdict = idx?.verdict || "—";
    const coverage = idx?.coverageState || "—";
    const lastCrawl = idx?.lastCrawlTime ? idx.lastCrawlTime.slice(0, 10) : "—";
    console.log(slug.padEnd(38), verdict.padEnd(20), coverage.slice(0, 23).padEnd(25), lastCrawl);
  } catch (e) {
    console.log(slug.padEnd(38), "ERR:", e.message);
  }
  await new Promise(r => setTimeout(r, 250));
}
