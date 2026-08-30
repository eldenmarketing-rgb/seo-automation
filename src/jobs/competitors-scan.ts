/**
 * Module Concurrents — collecte des faits, un site à la fois.
 *
 * Répond à « qui est devant nous, avec quoi ? » en écrivant des FAITS :
 *  1. la SERP de nos requêtes (top 10 mobile, localisée) → `competitor_serp`
 *  2. les domaines qui y reviennent → suggestions dans `competitors`
 *  3. pour chaque concurrent ACTIF et pour nous-mêmes : sitemap, profil de
 *     liens, contenu des pages qui nous battent → `competitor_snapshots`
 * Le verdict (contenu / liens / entité locale / indexation) et les actions se
 * calculent côté dashboard, jamais ici.
 *
 * Opt-in par site : rien n'est dépensé pour un site sans ligne `competitors`,
 * sauf avec `--suggest` (c'est ce que fait le bouton « Analyser » de l'onglet).
 *
 * Usage :
 *   npx tsx src/jobs/competitors-scan.ts                         # simulation, sites ayant des concurrents
 *   npx tsx src/jobs/competitors-scan.ts --site=garage --suggest # SERP + suggestions sur un site vierge
 *   npx tsx src/jobs/competitors-scan.ts --apply --trigger=cron  # écrit (cron du lundi 7h10)
 *   npx tsx src/jobs/competitors-scan.ts --max-queries=15
 *
 * Comme `crawl.ts`, le défaut est la simulation : `--apply` écrit.
 */
import { randomUUID } from 'crypto';
import { getSupabase, log } from '../db/supabase.js';
import * as logger from '../utils/logger.js';
import { inParallel } from '../crawler/index.js';
import { QUERY_LIMITS, loadQueryInputs, selectQueries } from '../competitors/queries.js';
import { fetchSerp } from '../competitors/serp.js';
import { backlinkSummary, referringDomains } from '../competitors/backlinks.js';
import { fetchSitemap } from '../competitors/sitemap.js';
import { fetchPageFacts } from '../competitors/page-facts.js';
import { isCleanReferring, normalizeDomain, sameDomain, serpDomainKind } from '../competitors/classify.js';
import type {
  CompetitorKind,
  CompetitorRow,
  PageFactsLite,
  QueryCandidate,
  SerpItem,
  SerpRowInsert,
  SnapshotInsert,
} from '../competitors/types.js';

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--site='))?.split('=')[1];
const apply = args.includes('--apply');
const suggest = args.includes('--suggest');
const trigger = args.find((a) => a.startsWith('--trigger='))?.split('=')[1] || 'cli';
const maxQueries = Number(
  args.find((a) => a.startsWith('--max-queries='))?.split('=')[1] || QUERY_LIMITS.total,
);

/** Un domaine proposé comme concurrent doit être en top 10 sur au moins ce nombre de requêtes. */
const SUGGEST_MIN_HITS = 3;
/** Pages lues par domaine (celles qui rankent devant nous). */
const PAGE_FACTS_MAX = 15;
const CHUNK = 200;

interface SiteRow {
  site_key: string;
  domain: string;
  scope: string | null;
  services: unknown;
  city: string | null;
  is_active: boolean;
}

interface SiteReport {
  queries: number;
  serp_rows: number;
  suggested: string[];
  snapshots: string[];
  cost: number;
  skipped?: string;
}

const pad = (s: string | number, n: number) => String(s).padEnd(n);
const num = (s: string | number, n: number) => String(s).padStart(n);

function bestOrganic(items: SerpItem[], domain: string): number | null {
  const mine = items.filter((i) => i.type === 'organic' && sameDomain(i.domain, domain));
  return mine.length ? Math.min(...mine.map((i) => i.position)) : null;
}

async function buildSnapshot(
  db: ReturnType<typeof getSupabase>,
  site: SiteRow,
  target: { domain: string; is_self: boolean },
  perQuery: Map<string, SerpItem[]>,
  ourBest: Map<string, number | null>,
  runId: string,
  now: string,
): Promise<{ snapshot: SnapshotInsert; cost: number }> {
  // ─── Ce que la SERP dit de ce domaine ───────────────────────────────────
  let top10 = 0;
  let posSum = 0;
  let posN = 0;
  let packHits = 0;
  let rating: number | null = null;
  let votes: number | null = null;
  const aboveUs = new Set<string>();

  for (const [query, items] of perQuery) {
    const best = bestOrganic(items, target.domain);
    if (best !== null && best <= 10) top10++;
    if (best !== null && best <= 20) {
      posSum += best;
      posN++;
    }
    const pack = items.filter((i) => i.type === 'local_pack' && sameDomain(i.domain, target.domain));
    if (pack.length) {
      packHits++;
      const richest = pack.reduce((a, b) => ((b.votes ?? 0) > (a.votes ?? 0) ? b : a));
      if ((richest.votes ?? 0) >= (votes ?? 0)) {
        votes = richest.votes;
        rating = richest.rating;
      }
    }
    const ours = ourBest.get(query) ?? null;
    for (const i of items) {
      if (i.type !== 'organic' || !i.url || !sameDomain(i.domain, target.domain)) continue;
      // Pour nous : nos pages classées (top 20). Pour un concurrent : ses pages
      // devant la nôtre, en première page seulement.
      const keep = target.is_self
        ? i.position <= 20
        : i.position <= 10 && (ours === null || i.position < ours);
      if (keep) aboveUs.add(i.url);
    }
  }

  // ─── Sitemap + nouveautés depuis le dernier passage ─────────────────────
  const sitemap = await fetchSitemap(target.domain);
  const { data: prev } = await db
    .from('competitor_snapshots')
    .select('sitemap_urls, sitemap_reached')
    .eq('site_key', site.site_key)
    .eq('domain', target.domain)
    .order('fetched_at', { ascending: false })
    .limit(1);
  const previous = prev?.[0] as { sitemap_urls: string[]; sitemap_reached: boolean } | undefined;
  const prevSet = new Set(previous?.sitemap_reached ? previous.sitemap_urls : []);
  const newUrls =
    previous?.sitemap_reached && sitemap.reached ? sitemap.urls.filter((u) => !prevSet.has(u)) : [];

  // ─── Liens ───────────────────────────────────────────────────────────────
  const { summary, cost: c1 } = await backlinkSummary(target.domain);
  const { domains: referring, cost: c2 } = await referringDomains(target.domain);
  // Liste plafonnée à 250 : sur un gros profil, le compte « propre » est une borne basse.
  const clean = referring.filter((r) => isCleanReferring(r.category, r.rank)).length;

  // ─── Les pages qui comptent ──────────────────────────────────────────────
  const urls = [...aboveUs].slice(0, PAGE_FACTS_MAX);
  const facts = await inParallel(urls, 3, fetchPageFacts);
  const pageFacts: Record<string, PageFactsLite> = {};
  urls.forEach((u, i) => (pageFacts[u] = facts[i]));

  return {
    cost: c1 + c2,
    snapshot: {
      run_id: runId,
      site_key: site.site_key,
      domain: target.domain,
      is_self: target.is_self,
      sitemap_reached: sitemap.reached,
      sitemap_urls: sitemap.urls,
      new_urls: newUrls,
      referring_domains: summary?.referring_domains ?? (referring.length || null),
      referring_domains_clean: referring.length ? clean : null,
      backlink_rank: summary?.rank ?? null,
      domain_first_seen: summary?.first_seen ?? null,
      referring,
      page_facts: pageFacts,
      serp_top10: top10,
      serp_avg_pos: posN ? Math.round((posSum / posN) * 10) / 10 : null,
      pack_hits: packHits,
      rating,
      votes,
      fetched_at: now,
    },
  };
}

async function scanSite(
  db: ReturnType<typeof getSupabase>,
  site: SiteRow,
  rows: CompetitorRow[],
): Promise<SiteReport> {
  const ourDomain = normalizeDomain(site.domain);
  const local = site.scope !== 'national';
  const inputs = await loadQueryInputs(db, site);
  const queries: QueryCandidate[] = selectQueries(inputs, { ...QUERY_LIMITS, total: maxQueries });
  if (queries.length === 0) {
    return { queries: 0, serp_rows: 0, suggested: [], snapshots: [], cost: 0, skipped: 'aucune requête' };
  }

  const runId = randomUUID();
  const now = new Date().toISOString();
  let cost = 0;

  // ─── 1. SERP ─────────────────────────────────────────────────────────────
  console.log(
    `\n  ${queries.length} requêtes (${queries.filter((q) => q.source === 'gsc').length} GSC, ` +
      `${queries.filter((q) => q.source === 'cluster').length} clusters, ` +
      `${queries.filter((q) => q.source === 'service').length} services) — SERP ${local ? 'Perpignan' : 'France'}, mobile, top 10\n`,
  );
  const perQuery = new Map<string, SerpItem[]>();
  const ourBest = new Map<string, number | null>();
  const serpRows: SerpRowInsert[] = [];
  const fetched = await inParallel(queries, 3, (q) => fetchSerp(q.query, { local }));
  queries.forEach((q, idx) => {
    const { items, cost: c } = fetched[idx];
    cost += c;
    perQuery.set(q.query, items);
    const best = bestOrganic(items, ourDomain);
    ourBest.set(q.query, best);
    for (const it of items) {
      serpRows.push({
        run_id: runId,
        site_key: site.site_key,
        query: q.query,
        query_source: q.source,
        impressions: q.impressions,
        position: it.position,
        type: it.type,
        domain: it.domain,
        url: it.url,
        title: it.title,
        rating: it.rating,
        votes: it.votes,
        is_ours: sameDomain(it.domain, ourDomain),
        fetched_at: now,
      });
    }
    const pack = items.filter((i) => i.type === 'local_pack');
    const inPack = pack.some((i) => sameDomain(i.domain, ourDomain));
    const top3 = items
      .filter((i) => i.type === 'organic')
      .slice(0, 3)
      .map((i) => i.domain)
      .join(', ');
    console.log(
      `  ${pad(q.query.slice(0, 38), 40)} ${num(best ?? '—', 3)}  ${pad(pack.length ? (inPack ? 'pack ✓' : 'pack ✗') : '', 7)} ${top3}`,
    );
  });

  // ─── 2. Suggestions ──────────────────────────────────────────────────────
  const hits = new Map<string, { hits: number; kind: CompetitorKind }>();
  for (const items of perQuery.values()) {
    const seen = new Set<string>();
    for (const it of items) {
      if (it.type !== 'organic' || it.position > 10 || sameDomain(it.domain, ourDomain)) continue;
      if (seen.has(it.domain)) continue;
      const kind = serpDomainKind(it.domain);
      if (!kind) continue;
      seen.add(it.domain);
      const h = hits.get(it.domain) ?? { hits: 0, kind };
      h.hits++;
      hits.set(it.domain, h);
    }
  }
  const byDomain = new Map(rows.map((r) => [r.domain, r]));
  const suggested = [...hits.entries()]
    .filter(([, h]) => h.hits >= SUGGEST_MIN_HITS)
    .sort((a, b) => b[1].hits - a[1].hits);
  const toInsert = suggested
    .filter(([d]) => !byDomain.has(d))
    .map(([domain, h]) => ({
      site_key: site.site_key,
      domain,
      kind: h.kind,
      status: 'suggested' as const,
      origin: 'serp' as const,
      serp_hits: h.hits,
    }));
  const toUpdate = suggested
    .filter(([d]) => byDomain.has(d))
    .map(([d, h]) => ({ id: byDomain.get(d)!.id, hits: h.hits }));

  if (suggested.length) {
    console.log(`\n  Domaines récurrents en top 10 (≥ ${SUGGEST_MIN_HITS} requêtes) :`);
    for (const [domain, h] of suggested) {
      const existing = byDomain.get(domain);
      const state = existing ? `déjà ${existing.status}` : 'nouveau → suggéré';
      console.log(`    ${pad(domain, 36)} ${num(h.hits, 3)} req.  ${pad(h.kind, 9)} ${state}`);
    }
  } else {
    console.log('\n  Aucun domaine récurrent en top 10.');
  }

  // ─── 3. Snapshots : nous + les concurrents actifs ────────────────────────
  const active = rows.filter((r) => r.status === 'active');
  const targets = [
    { domain: ourDomain, is_self: true },
    ...active.map((r) => ({ domain: r.domain, is_self: false })),
  ];
  const snapshots: SnapshotInsert[] = [];
  console.log(
    `\n  ${pad('Domaine', 34)} top10  pos   pack  avis        RD  propres  rang  pages  nouv.  lues`,
  );
  for (const t of targets) {
    const { snapshot, cost: c } = await buildSnapshot(db, site, t, perQuery, ourBest, runId, now);
    cost += c;
    snapshots.push(snapshot);
    const avis = snapshot.votes ? `${snapshot.rating ?? '?'}★ ${snapshot.votes}` : '';
    console.log(
      `  ${pad((t.is_self ? '● ' : '  ') + t.domain, 34)} ${num(snapshot.serp_top10, 5)} ${num(snapshot.serp_avg_pos ?? '—', 5)} ${num(snapshot.pack_hits, 5)}  ${pad(avis, 10)} ${num(snapshot.referring_domains ?? '—', 4)} ${num(snapshot.referring_domains_clean ?? '—', 8)} ${num(snapshot.backlink_rank ?? '—', 5)} ${num(snapshot.sitemap_reached ? snapshot.sitemap_urls.length : '—', 6)} ${num(snapshot.new_urls.length, 6)} ${num(Object.keys(snapshot.page_facts).length, 5)}`,
    );
  }
  if (active.length === 0) {
    console.log(
      '  (aucun concurrent actif : activer des suggestions dans l’onglet pour comparer les profils)',
    );
  }

  // ─── Écriture ────────────────────────────────────────────────────────────
  if (apply) {
    for (let i = 0; i < serpRows.length; i += CHUNK) {
      const { error } = await db.from('competitor_serp').insert(serpRows.slice(i, i + CHUNK));
      if (error) throw new Error(`competitor_serp ${site.site_key}: ${error.message}`);
    }
    if (toInsert.length) {
      const { error } = await db.from('competitors').insert(toInsert);
      if (error) throw new Error(`competitors ${site.site_key}: ${error.message}`);
    }
    for (const u of toUpdate) {
      await db.from('competitors').update({ serp_hits: u.hits, updated_at: now }).eq('id', u.id);
    }
    const { error } = await db.from('competitor_snapshots').insert(snapshots);
    if (error) throw new Error(`competitor_snapshots ${site.site_key}: ${error.message}`);
  }

  return {
    queries: queries.length,
    serp_rows: serpRows.length,
    suggested: toInsert.map((s) => s.domain),
    snapshots: snapshots.map((s) => s.domain),
    cost: Math.round(cost * 1000) / 1000,
  };
}

async function main() {
  const started = Date.now();
  const db = getSupabase();

  const { data: sites, error } = await db
    .from('site_profiles')
    .select('site_key, domain, scope, services, city, is_active')
    .order('site_key');
  if (error) throw new Error(`Registre des sites : ${error.message}`);

  const { data: compRows, error: compErr } = await db
    .from('competitors')
    .select('id, site_key, domain, label, kind, status, origin, serp_hits');
  if (compErr) throw new Error(`competitors : ${compErr.message}`);
  const competitors = (compRows || []) as CompetitorRow[];

  const targets = ((sites || []) as SiteRow[]).filter((s) => {
    if (!s.domain) return false;
    if (only) return s.site_key === only;
    // Opt-in : un site sans concurrent déclaré ne coûte rien.
    return s.is_active && competitors.some((c) => c.site_key === s.site_key);
  });
  if (targets.length === 0) {
    console.log(
      only
        ? `Aucun site « ${only} » avec un domaine.`
        : 'Aucun site avec des concurrents déclarés — `--site=<key> --suggest` pour en proposer.',
    );
    return;
  }

  console.log(
    apply
      ? '\n=== CONCURRENTS (écriture en base) ==='
      : '\n=== CONCURRENTS — SIMULATION (--apply pour écrire) ===',
  );

  const reports: Record<string, SiteReport> = {};
  let hadError = false;
  for (const site of targets) {
    const rows = competitors.filter((c) => c.site_key === site.site_key);
    console.log(
      `\n▶ ${site.site_key} — ${normalizeDomain(site.domain)} (${rows.filter((r) => r.status === 'active').length} actifs, ${rows.filter((r) => r.status === 'suggested').length} suggérés)`,
    );
    if (rows.length === 0 && !suggest) {
      console.log(
        '  Aucun concurrent déclaré : ajouter --suggest pour lancer la SERP et proposer des domaines.',
      );
      reports[site.site_key] = {
        queries: 0,
        serp_rows: 0,
        suggested: [],
        snapshots: [],
        cost: 0,
        skipped: 'opt-in',
      };
      continue;
    }
    try {
      reports[site.site_key] = await scanSite(db, site, rows);
    } catch (e) {
      hadError = true;
      logger.error(`Concurrents ${site.site_key} : ${(e as Error).message}`);
      reports[site.site_key] = {
        queries: 0,
        serp_rows: 0,
        suggested: [],
        snapshots: [],
        cost: 0,
        skipped: (e as Error).message,
      };
    }
  }

  const totalCost = Object.values(reports).reduce((s, r) => s + r.cost, 0);
  const durationMs = Date.now() - started;
  console.log(
    `\nCoût DataForSEO déclaré : $${totalCost.toFixed(3)} (les réponses servies du cache gardent leur coût d’origine) — ${Math.round(durationMs / 1000)} s`,
  );

  if (apply) {
    await log(
      'competitors-scan',
      'scan',
      hadError ? 'warning' : 'success',
      only,
      { trigger, sites: reports, cost: totalCost },
      durationMs,
    );
  }
}

main().catch(async (e) => {
  logger.error(`Concurrents fatal : ${e.message}`);
  if (apply)
    await log('competitors-scan', 'scan', 'error', only, { error: e.message, trigger }).catch(() => {});
  process.exit(1);
});
