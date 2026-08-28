/**
 * Diagnostic GSC pour S-Party — sitemaps + coverage + search analytics.
 */
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const SERVICE_ACCOUNT_PATH =
  process.env.GSC_SERVICE_ACCOUNT_PATH || "./config/gsc-service-account.json";

function getAuth() {
  return new GoogleAuth({
    keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
}

const PROPERTY = "sc-domain:s-party.fr";

async function main() {
  const auth = getAuth();
  const sc = google.searchconsole({ version: "v1", auth });

  console.log(`=== GSC Status — ${PROPERTY} ===\n`);

  // 1. Sitemaps
  console.log("--- Sitemaps enregistrés ---");
  try {
    const r = await sc.sitemaps.list({ siteUrl: PROPERTY });
    (r.data.sitemap || []).forEach((s) => {
      const submitted = s.contents?.[0]?.submitted || "?";
      const indexed = s.contents?.[0]?.indexed || "?";
      console.log(
        `  ${s.path}\n    soumis: ${s.lastSubmitted}\n    URLs soumises: ${submitted} · indexées: ${indexed}\n    erreurs: ${s.errors || 0} · warnings: ${s.warnings || 0}`
      );
    });
  } catch (e) {
    console.log(`  ✗ ${e instanceof Error ? e.message : e}`);
  }

  // 2. Search Analytics — performance globale (28 derniers jours)
  console.log("\n--- Performance search (28 derniers jours) ---");
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 3);
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 28);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const res = await sc.searchanalytics.query({
      siteUrl: PROPERTY,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["date"],
        rowLimit: 5,
      },
    });
    const rows = res.data.rows || [];
    if (rows.length === 0) {
      console.log(
        "  Aucune donnée (normal pour un site neuf — Google n'a pas encore d'impressions)"
      );
    } else {
      const total = rows.reduce(
        (acc, r) => ({
          clicks: acc.clicks + (r.clicks || 0),
          impressions: acc.impressions + (r.impressions || 0),
        }),
        { clicks: 0, impressions: 0 }
      );
      console.log(
        `  Période ${fmt(startDate)} → ${fmt(endDate)}\n  Clics: ${total.clicks} · Impressions: ${total.impressions}`
      );
    }
  } catch (e) {
    console.log(`  ✗ ${e instanceof Error ? e.message : e}`);
  }

  // 3. Top queries (si data existe)
  console.log("\n--- Top 10 requêtes (28j) ---");
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: PROPERTY,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["query"],
        rowLimit: 10,
      },
    });
    const rows = res.data.rows || [];
    if (rows.length === 0) {
      console.log("  Aucune requête enregistrée encore");
    } else {
      rows.forEach((r) => {
        console.log(
          `  "${r.keys?.[0]}" — pos ${r.position?.toFixed(1)} · imp ${r.impressions} · clics ${r.clicks}`
        );
      });
    }
  } catch (e) {
    console.log(`  ✗ ${e instanceof Error ? e.message : e}`);
  }

  // 4. Top pages (si data existe)
  console.log("\n--- Top 10 pages (28j) ---");
  try {
    const res = await sc.searchanalytics.query({
      siteUrl: PROPERTY,
      requestBody: {
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: ["page"],
        rowLimit: 10,
      },
    });
    const rows = res.data.rows || [];
    if (rows.length === 0) {
      console.log("  Aucune page avec impressions pour l'instant");
    } else {
      rows.forEach((r) => {
        console.log(
          `  ${r.keys?.[0]} — imp ${r.impressions} · clics ${r.clicks} · ctr ${((r.ctr || 0) * 100).toFixed(1)}%`
        );
      });
    }
  } catch (e) {
    console.log(`  ✗ ${e instanceof Error ? e.message : e}`);
  }

  console.log("\n=== Fin diagnostic ===");
}

main().catch((err) => {
  console.error("Erreur :", err);
  process.exit(1);
});
