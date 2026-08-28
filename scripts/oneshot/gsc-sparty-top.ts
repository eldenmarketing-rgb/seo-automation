/**
 * Top 10 mots-clés S-Party par position moyenne (filtre : ≥3 impressions pour exclure le bruit).
 * Période : 90 derniers jours.
 */
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SERVICE_ACCOUNT_PATH =
  process.env.GSC_SERVICE_ACCOUNT_PATH || "./config/gsc-service-account.json";
const PROPERTY = "sc-domain:s-party.fr";
const MIN_IMPRESSIONS = 3;

async function main() {
  const auth = new GoogleAuth({
    keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  const sc = google.searchconsole({ version: "v1", auth });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 90);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const res = await sc.searchanalytics.query({
    siteUrl: PROPERTY,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ["query"],
      rowLimit: 500,
    },
  });

  const rows = (res.data.rows || []).filter(
    (r) => (r.impressions || 0) >= MIN_IMPRESSIONS
  );

  console.log(
    `\n=== Top 10 mots-clés S-Party — ${fmt(startDate)} → ${fmt(endDate)} (90j) ===`
  );
  console.log(`Filtre : ≥ ${MIN_IMPRESSIONS} impressions\n`);

  console.log("--- Par position moyenne (meilleur classement) ---");
  const byPos = [...rows].sort((a, b) => (a.position || 99) - (b.position || 99)).slice(0, 10);
  byPos.forEach((r, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. "${r.keys?.[0]}" — pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks}`
    );
  });

  console.log("\n--- Par clics (qui rapporte le plus de trafic) ---");
  const byClicks = [...rows].sort((a, b) => (b.clicks || 0) - (a.clicks || 0)).slice(0, 10);
  byClicks.forEach((r, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. "${r.keys?.[0]}" — clics ${r.clicks} · imp ${r.impressions} · pos ${r.position?.toFixed(1)}`
    );
  });

  console.log("\n--- Par impressions (où Google nous montre le plus) ---");
  const byImp = [...rows].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 10);
  byImp.forEach((r, i) => {
    console.log(
      `${(i + 1).toString().padStart(2)}. "${r.keys?.[0]}" — imp ${r.impressions} · pos ${r.position?.toFixed(1)} · clics ${r.clicks}`
    );
  });
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
