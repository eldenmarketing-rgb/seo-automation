/**
 * Soumet à Bing les URL des sitemaps de nos sites (API Bing Webmaster).
 * Simulation par défaut ; --apply envoie. --site=<domaine> pour un seul site.
 * Bing plafonne à 100 URL / jour / site : on envoie dans la limite du quota restant,
 * accueil d'abord puis ordre du sitemap ; relancer le lendemain pour la suite.
 *
 *   npx tsx scripts/bing-submit.ts [--apply] [--site=plaquiste-66.fr]
 */
import { bareHost, listBingSites, submitUrlBatch, urlSubmissionQuota } from '../src/bing/webmaster.js';
import { fetchSitemap } from '../src/competitors/sitemap.js';

const apply = process.argv.includes('--apply');
const only = process.argv.find((a) => a.startsWith('--site='))?.slice(7);

const sites = (await listBingSites()).filter((s) => s.verified);
console.log(`${sites.length} sites vérifiés dans Bing — ${apply ? 'ENVOI' : 'simulation'}\n`);

for (const site of sites) {
  const host = bareHost(site.url);
  if (only && bareHost(`https://${only}`) !== host) continue;

  const { reached, urls } = await fetchSitemap(host);
  if (!reached) {
    console.log(`✗ ${host} — sitemap injoignable`);
    continue;
  }
  // Bing refuse les URL hors du site déclaré : on garde le même hôte (www ou non).
  const own = [...new Set(urls.filter((u) => bareHost(u) === host))].sort(
    (a, b) => Number(new URL(b).pathname === '/') - Number(new URL(a).pathname === '/'),
  );
  const { daily } = await urlSubmissionQuota(site.url);
  const batch = own.slice(0, daily);
  console.log(
    `${apply ? '→' : '·'} ${host} — ${own.length} URL au sitemap, quota du jour ${daily}, envoi ${batch.length}`,
  );
  if (apply && batch.length > 0) {
    try {
      await submitUrlBatch(site.url, batch);
      console.log('  ✓ accepté');
    } catch (e) {
      console.log(`  ✗ ${(e as Error).message}`);
    }
  }
}
