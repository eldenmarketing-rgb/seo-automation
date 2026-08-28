/**
 * S-party — vérifie l'indexation RÉELLE via l'API URL Inspection.
 * Le champ `indexed` de sitemaps.list est déprécié par Google (toujours 0).
 */
import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_PATH =
  process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json';

const PROPERTY = 'sc-domain:s-party.fr';

function getAuth() {
  return new GoogleAuth({
    keyFile: path.resolve(SERVICE_ACCOUNT_PATH),
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

async function fetchSitemap(url: string): Promise<string[]> {
  const r = await fetch(url);
  const xml = await r.text();
  const matches = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)];
  return matches.map((m) => m[1]);
}

async function main() {
  const auth = getAuth();
  const sc = google.searchconsole({ version: 'v1', auth });

  const urls = await fetchSitemap('https://s-party.fr/sitemap.xml');
  console.log(`Sitemap : ${urls.length} URLs\n`);
  console.log('URL                                                 | Verdict        | Coverage');
  console.log('----------------------------------------------------|----------------|---------');

  let indexed = 0;
  let notIndexed = 0;
  let errors = 0;

  for (const u of urls) {
    try {
      const r = await sc.urlInspection.index.inspect({
        requestBody: { inspectionUrl: u, siteUrl: PROPERTY },
      });
      const idx = r.data.inspectionResult?.indexStatusResult;
      const verdict = idx?.verdict || '?';
      const coverage = idx?.coverageState || '?';
      const short = u.replace('https://s-party.fr', '').padEnd(52);
      console.log(`${short}| ${verdict.padEnd(14)} | ${coverage}`);
      if (verdict === 'PASS') indexed++;
      else notIndexed++;
    } catch (e) {
      console.log(`${u} — erreur: ${(e as Error).message}`);
      errors++;
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  console.log(`\n=== Total ${urls.length} URLs — indexées: ${indexed} · non-indexées: ${notIndexed} · erreurs: ${errors} ===`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
