/**
 * B2 — crawl du réseau et relevé de l'état d'indexation réel.
 *
 * Le système ne savait pas quelles pages sont indexées : les détecteurs du
 * backlog ne lisent que `gsc_positions`, qui ne contient que les pages ayant
 * déjà des impressions. Une page inconnue de Google y était indiscernable d'une
 * page qui n'existe pas. Ce script produit le dénominateur manquant.
 *
 * Usage :
 *   npx tsx scripts/crawl.ts                      # simulation, tous les sites actifs
 *   npx tsx scripts/crawl.ts --site=carrosserie   # un seul site
 *   npx tsx scripts/crawl.ts --apply              # écrit dans crawl_results
 *   npx tsx scripts/crawl.ts --no-inspect         # sans appel à l'API GSC
 *   npx tsx scripts/crawl.ts --max-urls=600
 *
 * Comme `import-inventaire.ts`, le défaut est la simulation : `--apply` écrit.
 */
import { randomUUID } from 'crypto';
import { getSupabase } from '../src/db/supabase.js';
import { crawlSite } from '../src/crawler/index.js';
import { ISSUE_LABELS } from '../src/crawler/issues.js';
import type { CrawlRow } from '../src/crawler/types.js';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--site='))?.split('=')[1];
const apply = args.includes('--apply');
const inspect = !args.includes('--no-inspect');
const maxUrls = Number(args.find((a) => a.startsWith('--max-urls='))?.split('=')[1] || 400);

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);

/** Étapes affichées dans le résumé de funnel, dans l'ordre. */
const FUNNEL_VIEW: Array<[string, string]> = [
  ['HTTP_200', 'répond 200'],
  ['INDEXABLE', 'indexable'],
  ['IN_SITEMAP', 'au sitemap'],
  ['INTERNALLY_LINKED', 'maillée'],
  ['DISCOVERED', 'connue de Google'],
  ['CRAWLED', 'crawlée'],
  ['INDEXED', 'indexée'],
  ['RECEIVING_IMPRESSIONS', 'avec impressions'],
];

const ORDER = ['DEPLOYED', ...FUNNEL_VIEW.map(([k]) => k)];

/** Combien d'URL ont atteint AU MOINS cette étape. */
function reached(rows: CrawlRow[], stage: string): number {
  const min = ORDER.indexOf(stage);
  return rows.filter((r) => ORDER.indexOf(r.funnel_stage) >= min).length;
}

async function main() {
  const db = getSupabase();

  const { data: sites, error } = await db
    .from('site_profiles')
    .select('site_key, domain, is_active')
    .order('site_key');
  if (error) throw new Error(`Registre des sites : ${error.message}`);

  const targets = (sites || []).filter((s: any) => s.domain && (only ? s.site_key === only : s.is_active));
  if (targets.length === 0) {
    console.log(only ? `Aucun site « ${only} » avec un domaine.` : 'Aucun site actif avec un domaine.');
    return;
  }

  console.log(
    apply ? '\n=== CRAWL (écriture en base) ===' : '\n=== CRAWL — SIMULATION (--apply pour écrire) ===',
  );
  console.log(
    `${targets.length} site(s) · inspection GSC ${inspect ? 'activée' : 'désactivée'} · plafond ${maxUrls} URL/site\n`,
  );

  const runId = randomUUID();
  let grandTotal = 0;

  for (const site of targets as Array<{ site_key: string; domain: string }>) {
    const started = Date.now();
    let result;
    try {
      result = await crawlSite(site, { inspect, maxUrls });
    } catch (e: any) {
      console.log(`${pad(site.site_key, 14)} ⚠  ${e.message}\n`);
      continue;
    }

    const rows = result.rows;
    const byState = (s: string) => rows.filter((r) => r.expected_state === s);
    const indexables = byState('indexable');

    console.log(
      `${pad(site.site_key, 14)} ${result.domain}` +
        (result.property ? `  ·  ${result.property}` : '  ·  pas de propriété GSC'),
    );

    // Ce que le site déclare : deux faits sans URL, donc invisibles du funnel.
    // Un robots.txt disparu n'y produit aucune anomalie (absent = tout autorisé).
    const ck = result.checks;
    console.log(
      `   robots.txt ${ck.robots.fetched ? `OK (${ck.robots.rules} règle(s) ${ck.robots.group ?? ''}, ${ck.robots.sitemaps.length} sitemap déclaré)` : `⚠ HTTP ${ck.robots.status}`}` +
        ` · sitemap ${ck.sitemap.reached ? `OK (${ck.sitemap.urls.length} URL, ${ck.sitemap.sources.length} fichier(s))` : `⚠ HTTP ${ck.sitemap.status}`}`,
    );
    console.log(
      `   ${rows.length} URL crawlées en ${Math.round((Date.now() - started) / 1000)} s · ` +
        `${indexables.length} censées être indexées · ${byState('redirected').length} redirigées · ` +
        `${byState('draft').length} brouillon(s) · ${byState('out_of_scope').length} hors périmètre` +
        (result.sitemapError ? ` · ⚠ ${result.sitemapError}` : ''),
    );

    // Funnel : uniquement sur les pages censées être indexées. Les redirections
    // n'y ont pas leur place — elles ont été supprimées exprès.
    const funnel = FUNNEL_VIEW.map(([key, label]) => `${label} ${reached(indexables, key)}`).join(' · ');
    console.log(`   funnel (${indexables.length}) : ${funnel}`);

    // Anomalies, groupées par cause.
    const groups = new Map<string, CrawlRow[]>();
    for (const row of rows) {
      for (const issue of row.issues) {
        const list = groups.get(issue) || [];
        list.push(row);
        groups.set(issue, list);
      }
    }
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
    if (sorted.length) console.log('   anomalies :');
    for (const [issue, list] of sorted) {
      console.log(`     ${pad(ISSUE_LABELS[issue] || issue, 44)} ${num(list.length, 3)}`);
      for (const row of list.slice(0, 6)) {
        const detail =
          row.gsc_coverage_state ||
          (row.http_status !== 200
            ? `HTTP ${row.http_status}${row.fetchError ? ` (${row.fetchError})` : ''}`
            : '');
        console.log(`        /${pad(row.slug, 48)} ${detail}`);
      }
      if (list.length > 6) console.log(`        … et ${list.length - 6} autre(s)`);
    }

    // Alignements : la base disait autre chose que ce que le site sert. Ce ne
    // sont pas des décisions, ce sont des constats — mais on les affiche un par
    // un, avec leur preuve : une correction silencieuse de la base serait pire
    // que l'écart qu'elle répare.
    if (result.alignements.length) {
      console.log(`   base alignée sur la réalité (${result.alignements.length}) :`);
      for (const a of result.alignements) {
        console.log(`     ${pad(new URL(a.url).pathname, 44)} ${a.de} → ${a.vers}`);
        console.log(`        ${a.preuve}`);
      }
    }

    if (apply) {
      for (const a of result.alignements) {
        const { error: alErr } = await db
          .from('seo_pages')
          .update({ status: a.vers, updated_at: new Date().toISOString() })
          .eq('id', a.page_id);
        if (alErr) console.log(`     ⚠ alignement ${a.url} : ${alErr.message}`);
      }
      if (result.alignements.length) {
        // La table s'appelle `job_name`/`action`, pas `job_type` — vérifié en base.
        const { error: logErr } = await db.from('automation_logs').insert({
          job_name: 'crawl',
          action: `${result.alignements.length} statut(s) alignés sur la réalité`,
          site_key: site.site_key,
          status: 'success',
          details: { run_id: runId, alignements: result.alignements },
        });
        if (logErr) console.log(`     ⚠ journal : ${logErr.message}`);
        console.log(`   ✅ ${result.alignements.length} statut(s) corrigé(s) dans seo_pages`);
      }

      const { error: ckErr } = await db.from('crawl_site_checks').insert({
        run_id: runId,
        site_key: site.site_key,
        robots_status: ck.robots.status,
        robots_fetched: ck.robots.fetched,
        robots_group: ck.robots.group,
        robots_rules: ck.robots.rules,
        robots_sitemaps: ck.robots.sitemaps,
        robots_body: ck.robots.body || null,
        sitemap_status: ck.sitemap.status,
        sitemap_reached: ck.sitemap.reached,
        sitemap_sources: ck.sitemap.sources,
        sitemap_urls: ck.sitemap.urls,
      });
      if (ckErr) throw new Error(`Écriture des vérifications site ${site.site_key} : ${ckErr.message}`);

      const payload = rows.map(({ impressions28: _i, fetchError: _f, ...row }) => ({
        ...row,
        run_id: runId,
      }));
      for (let i = 0; i < payload.length; i += 200) {
        const { error: insErr } = await db.from('crawl_results').insert(payload.slice(i, i + 200));
        if (insErr) throw new Error(`Écriture ${site.site_key} : ${insErr.message}`);
      }
      console.log(`   ✅ ${rows.length} ligne(s) écrite(s) dans crawl_results`);

      // Rétention de l'extrait rendu : tout le système lit `v_crawl_latest`,
      // donc seul le dernier passage a besoin de porter son contenu. Les
      // passages antérieurs gardent leurs faits, pas leur texte.
      const { error: purgeErr } = await db
        .from('crawl_results')
        .update({ content_extract: null })
        .eq('site_key', site.site_key)
        .neq('run_id', runId)
        .not('content_extract', 'is', null);
      if (purgeErr) console.log(`   ⚠ purge des extraits : ${purgeErr.message}`);
    }

    grandTotal += rows.length;
    console.log('');
  }

  console.log(
    `${grandTotal} URL ${apply ? 'enregistrées' : 'analysées'}` +
      (apply ? ` · run ${runId}` : ' · relancer avec --apply pour écrire') +
      '\n',
  );
}

main().catch((e) => {
  console.error('❌', e.message);
  process.exit(1);
});
