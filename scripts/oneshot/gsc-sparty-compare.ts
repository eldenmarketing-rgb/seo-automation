/**
 * Comparaison GSC S-Party : avant vs après la refonte du 2026-04-21.
 * Avant : 2026-03-23 → 2026-04-20 (28j avant refonte)
 * Après : 2026-04-22 → aujourd'hui-3
 */
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SERVICE_ACCOUNT_PATH =
  process.env.GSC_SERVICE_ACCOUNT_PATH || "./config/gsc-service-account.json";

const PROPERTY = "sc-domain:s-party.fr";
const REFONTE_DATE = "2026-04-21";

function getAuth() {
  return new GoogleAuth({
    keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

async function query(sc: any, startDate: string, endDate: string, dimensions: string[], rowLimit = 50) {
  const res = await sc.searchanalytics.query({
    siteUrl: PROPERTY,
    requestBody: { startDate, endDate, dimensions, rowLimit },
  });
  return res.data.rows || [];
}

async function main() {
  const auth = getAuth();
  const sc = google.searchconsole({ version: "v1", auth });

  // Période AVANT refonte : 28 jours avant le 21 avril
  const beforeEnd = new Date("2026-04-20");
  const beforeStart = new Date(beforeEnd);
  beforeStart.setDate(beforeStart.getDate() - 27);

  // Période APRÈS refonte : du 22 avril à aujourd'hui-3
  const afterStart = new Date("2026-04-22");
  const afterEnd = new Date();
  afterEnd.setDate(afterEnd.getDate() - 3);

  console.log(`=== Comparaison GSC S-Party — refonte ${REFONTE_DATE} ===\n`);
  console.log(`AVANT : ${fmt(beforeStart)} → ${fmt(beforeEnd)} (${28} jours)`);
  console.log(`APRÈS : ${fmt(afterStart)} → ${fmt(afterEnd)} (${Math.ceil((afterEnd.getTime() - afterStart.getTime()) / 86400000)} jours)\n`);

  // === Totaux ===
  console.log("--- Totaux ---");
  for (const [label, s, e] of [
    ["AVANT", fmt(beforeStart), fmt(beforeEnd)],
    ["APRÈS", fmt(afterStart), fmt(afterEnd)],
  ] as const) {
    const rows = await query(sc, s, e, ["date"], 100);
    const total = rows.reduce(
      (acc, r) => ({
        clicks: acc.clicks + (r.clicks || 0),
        impressions: acc.impressions + (r.impressions || 0),
      }),
      { clicks: 0, impressions: 0 }
    );
    const avgPos = rows.length
      ? rows.reduce((a, r) => a + (r.position || 0) * (r.impressions || 0), 0) /
        Math.max(1, total.impressions)
      : 0;
    console.log(
      `  ${label}: ${total.clicks} clics · ${total.impressions} imp · pos moy ${avgPos.toFixed(1)}`
    );
  }

  // === Top requêtes : comparaison ===
  console.log("\n--- Top requêtes AVANT refonte ---");
  const queriesBefore = await query(sc, fmt(beforeStart), fmt(beforeEnd), ["query"], 25);
  queriesBefore.forEach((r) => {
    console.log(
      `  "${r.keys?.[0]}" — pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks}`
    );
  });

  console.log("\n--- Top requêtes APRÈS refonte ---");
  const queriesAfter = await query(sc, fmt(afterStart), fmt(afterEnd), ["query"], 25);
  queriesAfter.forEach((r) => {
    console.log(
      `  "${r.keys?.[0]}" — pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks}`
    );
  });

  // === Requêtes perdues ===
  console.log("\n--- Requêtes PERDUES (présentes avant, absentes après) ---");
  const afterQueries = new Set(queriesAfter.map((r) => r.keys?.[0]));
  const lost = queriesBefore.filter((r) => !afterQueries.has(r.keys?.[0]));
  if (lost.length === 0) {
    console.log("  Aucune");
  } else {
    lost.forEach((r) => {
      console.log(
        `  "${r.keys?.[0]}" — pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks}`
      );
    });
  }

  // === Pages perdues ===
  console.log("\n--- Top pages AVANT refonte ---");
  const pagesBefore = await query(sc, fmt(beforeStart), fmt(beforeEnd), ["page"], 20);
  pagesBefore.forEach((r) => {
    console.log(`  ${r.keys?.[0]} — imp ${r.impressions} · clics ${r.clicks}`);
  });

  console.log("\n--- Top pages APRÈS refonte ---");
  const pagesAfter = await query(sc, fmt(afterStart), fmt(afterEnd), ["page"], 20);
  pagesAfter.forEach((r) => {
    console.log(`  ${r.keys?.[0]} — imp ${r.impressions} · clics ${r.clicks}`);
  });

  console.log("\n=== Fin ===");
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
