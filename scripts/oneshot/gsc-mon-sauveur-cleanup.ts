import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";

const auth = new GoogleAuth({
  keyFile: path.resolve("./config/gsc-service-account.json"),
  scopes: ["https://www.googleapis.com/auth/webmasters"],
});
const sc = google.searchconsole({ version: "v1", auth });

const PROP = "sc-domain:livraison-alcool-nuit-perpignan.com";
const BASE = "https://livraison-alcool-nuit-perpignan.com";

const OBSOLETE_SITEMAPS = [
  `${BASE}/sitemap-0.xml`,
  `https://www.livraison-alcool-nuit-perpignan.com/sitemap.xml`,
];

const KEEP_SITEMAP = `${BASE}/sitemap.xml`;

async function run() {
  console.log(`\n=== GSC cleanup — ${PROP} ===\n`);

  const before = await sc.sitemaps.list({ siteUrl: PROP });
  console.log("Sitemaps actuellement soumis:");
  (before.data.sitemap || []).forEach((s) =>
    console.log(`  ${s.path}  (submitted: ${s.lastSubmitted?.slice(0, 10)})`),
  );

  for (const url of OBSOLETE_SITEMAPS) {
    try {
      await sc.sitemaps.delete({ siteUrl: PROP, feedpath: url });
      console.log(`✓ supprimé: ${url}`);
    } catch (e: any) {
      console.log(`✗ échec suppression ${url}: ${e.message}`);
    }
  }

  try {
    await sc.sitemaps.submit({ siteUrl: PROP, feedpath: KEEP_SITEMAP });
    console.log(`✓ resoumis: ${KEEP_SITEMAP}`);
  } catch (e: any) {
    console.log(`✗ échec resoumission: ${e.message}`);
  }

  const after = await sc.sitemaps.list({ siteUrl: PROP });
  console.log("\nSitemaps après cleanup:");
  (after.data.sitemap || []).forEach((s) =>
    console.log(
      `  ${s.path}  (last ${s.lastSubmitted?.slice(0, 10)} · indexed ${s.contents?.[0]?.indexed || 0}/${s.contents?.[0]?.submitted || 0})`,
    ),
  );
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
