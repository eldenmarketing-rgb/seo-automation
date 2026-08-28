/**
 * Nettoyage GSC S-Party : delete old www sitemap + resubmit apex sitemap.
 * Run after inverting Vercel domain primary (www→apex redirect).
 */
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters"],
});
const sc = google.searchconsole({ version: "v1", auth });
const PROP = "sc-domain:s-party.fr";

async function main() {
  // Delete old www sitemap (redondant maintenant que www → apex)
  try {
    await sc.sitemaps.delete({
      siteUrl: PROP,
      feedpath: "https://www.s-party.fr/sitemap.xml",
    });
    console.log("✓ Supprimé : https://www.s-party.fr/sitemap.xml");
  } catch (e) {
    console.log("www sitemap delete:", e instanceof Error ? e.message : e);
  }

  // Re-submit apex sitemap pour forcer recrawl
  try {
    await sc.sitemaps.submit({
      siteUrl: PROP,
      feedpath: "https://s-party.fr/sitemap.xml",
    });
    console.log("✓ Re-soumis : https://s-party.fr/sitemap.xml");
  } catch (e) {
    console.log("resubmit:", e instanceof Error ? e.message : e);
  }

  // État final
  const r = await sc.sitemaps.list({ siteUrl: PROP });
  console.log("\n--- Sitemaps actuels ---");
  (r.data.sitemap || []).forEach((s) =>
    console.log(
      `  ${s.path} — soumises: ${s.contents?.[0]?.submitted || "?"} · indexées: ${s.contents?.[0]?.indexed || "?"}`
    )
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
