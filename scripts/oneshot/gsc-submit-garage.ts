import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import path from "path";
const auth = new GoogleAuth({ keyFile: path.resolve("./config/gsc-service-account.json"), scopes: ["https://www.googleapis.com/auth/webmasters"] });
const sc = google.searchconsole({ version: "v1", auth });
const SITE = "sc-domain:garage-perpignan.fr";
(async () => {
  await sc.sitemaps.submit({ siteUrl: SITE, feedpath: "https://garage-perpignan.fr/sitemap.xml" });
  console.log("✓ Sitemap resoumis");
  const sm = await sc.sitemaps.get({ siteUrl: SITE, feedpath: "https://garage-perpignan.fr/sitemap.xml" });
  console.log(`  submitted: ${sm.data.lastSubmitted}`);
  console.log(`  warnings: ${sm.data.warnings} errors: ${sm.data.errors} pending: ${sm.data.isPending}`);
})().catch(e => console.error(e));
