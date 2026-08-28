/**
 * Soumission sitemap S-Party à Google Search Console via API.
 *
 * PRÉREQUIS (à faire côté user avant de lancer ce script) :
 *  1. Propriété s-party.fr ajoutée dans GSC (https://search.google.com/search-console)
 *  2. Propriété vérifiée (DNS TXT ou balise HTML)
 *  3. Service account ajouté comme "Propriétaire" :
 *     seo-automation@seo-automatisation-478810.iam.gserviceaccount.com
 *
 * Usage :
 *   npx tsx scripts/submit-sparty-sitemap.ts
 */

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const SERVICE_ACCOUNT_PATH =
  process.env.GSC_SERVICE_ACCOUNT_PATH || './config/gsc-service-account.json';

// Supporte les deux formats de propriété GSC : sc-domain:... OU https://...
const GSC_PROPERTIES = [
  'sc-domain:s-party.fr',
  'https://s-party.fr/',
  'https://s-party.fr',
];
const SITEMAP_URL = 'https://s-party.fr/sitemap.xml';

function getAuth() {
  const keyFilePath = path.resolve(SERVICE_ACCOUNT_PATH);
  return new GoogleAuth({
    keyFile: keyFilePath,
    // Scope write obligatoire pour submit sitemap (readonly ne suffit pas)
    scopes: ['https://www.googleapis.com/auth/webmasters'],
  });
}

async function submitSitemap(siteUrl: string, sitemapUrl: string) {
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    await searchconsole.sitemaps.submit({
      siteUrl,
      feedpath: sitemapUrl,
    });
    console.log(`✓ Sitemap soumis pour ${siteUrl}`);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('403') || msg.includes('not found') || msg.includes('does not')) {
      // Propriété pas accessible — essayer le format suivant
      return false;
    }
    console.error(`✗ ${siteUrl}: ${msg}`);
    return false;
  }
}

async function listSitemaps(siteUrl: string) {
  const auth = getAuth();
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    const res = await searchconsole.sitemaps.list({ siteUrl });
    return res.data.sitemap || [];
  } catch {
    return [];
  }
}

async function main() {
  console.log('--- Soumission sitemap S-Party à GSC ---\n');

  let submitted = false;
  for (const property of GSC_PROPERTIES) {
    console.log(`Tentative : ${property}`);
    const ok = await submitSitemap(property, SITEMAP_URL);
    if (ok) {
      submitted = true;
      console.log('\n--- Sitemaps actuels sur cette propriété ---');
      const list = await listSitemaps(property);
      list.forEach((s) =>
        console.log(
          `  ${s.path} — soumis ${s.lastSubmitted || '?'} — ${s.contents?.[0]?.submitted || '?'} URLs`
        )
      );
      break;
    }
  }

  if (!submitted) {
    console.error(
      '\n✗ Aucune propriété GSC accessible. Vérifier :\n' +
        '  1. Propriété s-party.fr ajoutée sur https://search.google.com/search-console\n' +
        '  2. Propriété vérifiée\n' +
        '  3. Service account seo-automation@seo-automatisation-478810.iam.gserviceaccount.com\n' +
        '     ajouté en "Propriétaire" (pas juste "Utilisateur")'
    );
    process.exit(1);
  }

  console.log(
    '\n✓ Sitemap soumis avec succès.\n' +
      '  Google va maintenant crawler les URLs — allez 24-72h avant de voir apparaître les pages dans GSC → Couverture.'
  );
}

main().catch((err) => {
  console.error('Erreur fatale :', err);
  process.exit(1);
});
