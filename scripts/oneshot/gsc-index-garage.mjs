import { google } from 'googleapis';
import fs from 'fs';

const key = JSON.parse(fs.readFileSync('/home/ubuntu/sites/seo-automation/config/gsc-service-account.json', 'utf8'));
const auth = new google.auth.JWT(key.client_email, null, key.private_key, [
  'https://www.googleapis.com/auth/webmasters.readonly',
]);
await auth.authorize();
const sc = google.searchconsole({ version: 'v1', auth });
const siteUrl = 'sc-domain:garage-perpignan.fr';

console.log('=== SITEMAPS DECLARES ===');
try {
  const sm = await sc.sitemaps.list({ siteUrl });
  for (const s of sm.data.sitemap || []) {
    console.log(`${s.path}\n  soumis=${s.lastSubmitted}  lu=${s.lastDownloaded}  erreurs=${s.errors} warnings=${s.warnings}`);
    for (const c of s.contents || []) console.log(`  type=${c.type} soumises=${c.submitted} indexees=${c.indexed}`);
  }
  if (!sm.data.sitemap?.length) console.log('AUCUN SITEMAP SOUMIS');
} catch (e) { console.log('erreur sitemaps:', e.message); }

const sitemapXml = fs.readFileSync('/home/ubuntu/sites/Site_Garage/public/sitemap-0.xml', 'utf8');
const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

console.log(`\n=== INSPECTION URL (${urls.length} pages du sitemap) ===\n`);
for (const url of urls) {
  try {
    const r = await sc.urlInspection.index.inspect({
      requestBody: { inspectionUrl: url, siteUrl, languageCode: 'fr' },
    });
    const i = r.data.inspectionResult?.indexStatusResult || {};
    const path = url.replace('https://garage-perpignan.fr', '') || '/';
    console.log(
      `${path.padEnd(38)} ${String(i.coverageState).slice(0,42).padEnd(44)} verdict=${i.verdict} robots=${i.robotsTxtState} indexing=${i.indexingState}`
    );
    if (i.lastCrawlTime) console.log(`${''.padEnd(38)} dernier crawl: ${i.lastCrawlTime}  canonical Google: ${i.googleCanonical}`);
    else console.log(`${''.padEnd(38)} JAMAIS CRAWLEE`);
  } catch (e) {
    console.log(`${url} -> ERREUR ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 900));
}
