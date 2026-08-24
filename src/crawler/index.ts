/**
 * Crawl d'un site : produire les faits par URL, puis y adosser l'état
 * d'indexation réel dit par Google.
 *
 * L'ensemble des URL vient de trois sources réunies, chacune comblant un trou
 * des deux autres :
 *  - `seo_pages` — ce que le système croit avoir publié (et les redirections) ;
 *  - le sitemap — ce que le site déclare à Google ;
 *  - le parcours des liens depuis l'accueil — ce qui existe vraiment, y compris
 *    les pages absentes de la base ET du sitemap. C'est cette troisième source
 *    qui rend visibles les pages que personne ne sait plus avoir créées.
 */
import { getSupabase } from '../db/supabase.js';
import { resolveProperty } from '../gsc/property.js';
import { inspectUrl } from '../gsc/inspect.js';
import { fetchUrl, fetchText } from './fetch.js';
import { loadRobots, isAllowed } from './robots.js';
import { parsePage } from './parse.js';
import { buildGraph } from './graph.js';
import { computeFunnelStage } from './funnel.js';
import { detectIssues } from './issues.js';
import { isOutOfScope } from './scope.js';
import { normalizeUrl, type CrawlRow, type ExpectedState, type SiteCrawlResult } from './types.js';
import * as logger from '../utils/logger.js';

export interface CrawlOptions {
  /** Interroger l'API GSC URL Inspection (défaut : oui). */
  inspect?: boolean;
  /** Plafond d'URL par site. */
  maxUrls?: number;
  /**
   * Requêtes menées de front. Le goulot n'est pas le CPU mais l'attente réseau
   * — surtout l'API GSC, qui met 2 à 4 s par URL. 5 reste anodin pour un site
   * hébergé sur Vercel, et très loin des 600 appels/minute autorisés par GSC.
   */
  concurrency?: number;
  onProgress?: (done: number, total: number, url: string) => void;
}

/** Exécute `task` sur chaque élément, `limit` en vol à la fois, ordre préservé. */
async function inParallel<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await task(items[i]);
    }
  });

  await Promise.all(workers);
  return out;
}

/** Fichiers qui ne sont pas des pages. */
const NOT_A_PAGE = /\.(jpg|jpeg|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|pdf|zip|mp4|webm|woff2?|ttf)$/i;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function slugOf(url: string, origin: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '').replace(/\/$/, '');
  } catch {
    return url.replace(origin, '').replace(/^\//, '');
  }
}

function expectedStateFor(slug: string, dbStatus?: string): ExpectedState {
  if (isOutOfScope(slug)) return 'out_of_scope';
  if (dbStatus === 'redirected') return 'redirected';
  if (dbStatus === 'draft' || dbStatus === 'brief_ready' || dbStatus === 'error') return 'draft';
  // Une URL découverte en ligne sans ligne en base est bel et bien censée être
  // indexée : c'est justement le cas le plus intéressant.
  return 'indexable';
}

function locsOf(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
}

/** URL déclarées au sitemap (index de sitemaps compris, un niveau). */
async function sitemapUrls(origin: string, declared: string[]): Promise<{ urls: Set<string>; error?: string }> {
  const candidates = [...new Set([...declared, `${origin}/sitemap.xml`])];
  const urls = new Set<string>();
  let reached = false;

  for (const candidate of candidates) {
    const { status, body } = await fetchText(candidate);
    if (status !== 200) continue;
    reached = true;

    if (/<sitemapindex/i.test(body)) {
      for (const child of locsOf(body)) {
        const sub = await fetchText(child);
        if (sub.status === 200) for (const u of locsOf(sub.body)) urls.add(u);
      }
    } else {
      for (const u of locsOf(body)) urls.add(u);
    }
  }

  return reached ? { urls } : { urls, error: 'aucun sitemap joignable' };
}

/**
 * ─── Alignement de la base sur la réalité constatée ────────────────────────
 *
 * Une partie des « écarts base ↔ réalité » n'appelle aucune décision : le crawl
 * prouve l'état, il n'y a qu'à l'enregistrer. Le 2026-08-23, 27 pages du réseau
 * étaient dans ce cas (brouillons servis en ligne depuis des mois, pages dites
 * publiées qui redirigent) et il a fallu un script à la main pour les corriger.
 * Le crawl le fait maintenant lui-même, à chaque passage.
 *
 * Deux règles seulement, et toutes deux sont des constats, jamais des choix :
 *
 * 1. la base dit brouillon, l'URL répond 200, elle est indexable **et le site
 *    la déclare à son propre sitemap** → le site la publie, la base l'ignore.
 *    Le sitemap est l'exigence qui distingue « publiée » d'une page de test
 *    laissée accessible.
 * 2. la base dit publiée, l'URL redirige **et la cible répond 200** → la
 *    redirection est voulue et elle marche. Si la cible casse, on ne touche à
 *    rien : c'est un vrai défaut, il doit rester une action.
 *
 * Ce qui n'est PAS aligné, exprès : une page publiée qui répond 404 (a-t-elle
 * disparu ou jamais été déployée ?) et une page dite redirigée qui répond 200
 * (redirection oubliée, ou landing Ads volontaire ?). Ces deux-là demandent un
 * arbitrage humain — les deviner ferait mentir la base dans l'autre sens.
 */
export interface Alignement {
  page_id: string;
  url: string;
  de: string;
  vers: string;
  preuve: string;
}

/** Le statut prouvé par la réalité, ou `null` s'il n'y a rien à corriger. */
function statutProuve(
  row: CrawlRow,
  statutBase: string,
  siteEnCms: boolean
): { statut: string; preuve: string } | null {
  if (row.expected_state === 'out_of_scope') return null;

  if (['draft', 'brief_ready', 'error'].includes(statutBase)) {
    if (row.http_status === 200 && row.indexable && row.in_sitemap) {
      // Sur un site en CMS, une page servie alors que le CMS la dit brouillon
      // est rendue par le code du site : c'est ce que veut dire `external`.
      return {
        statut: siteEnCms ? 'external' : 'published',
        preuve: 'répond 200, indexable, déclarée au sitemap du site',
      };
    }
    return null;
  }

  if (['published', 'optimized', 'external'].includes(statutBase)) {
    if (row.redirect_chain.length > 0 && row.http_status === 200) {
      const cible = row.final_url || '?';
      return { statut: 'redirected', preuve: `redirige (${row.redirect_chain.map((c) => c.status).join(' → ')}) vers ${cible}, qui répond 200` };
    }
    return null;
  }

  return null;
}

export async function crawlSite(
  site: { site_key: string; domain: string },
  opts: CrawlOptions = {}
): Promise<SiteCrawlResult> {
  const { inspect = true, maxUrls = 400, concurrency = 5, onProgress } = opts;
  const db = getSupabase();

  const base = site.domain.replace(/\/$/, '');
  const origin = new URL(base).origin;
  const home = `${origin}/`;

  // ─── Ce que la base croit ────────────────────────────────────────────────
  const { data: dbPages, error: dbErr } = await db
    .from('seo_pages')
    .select('id, slug, status')
    .eq('site_key', site.site_key);
  if (dbErr) throw new Error(`Pages de ${site.site_key} : ${dbErr.message}`);

  const dbByKey = new Map<string, { id: string; slug: string; status: string }>();
  for (const p of dbPages || []) {
    dbByKey.set(normalizeUrl(`${origin}/${p.slug}`), p as any);
  }

  // ─── Ce que le site déclare ──────────────────────────────────────────────
  const robots = await loadRobots(origin);
  const { urls: sitemap, error: sitemapError } = await sitemapUrls(origin, robots.sitemaps);
  const sitemapKeys = new Set([...sitemap].map(normalizeUrl));

  // ─── File de crawl ───────────────────────────────────────────────────────
  const queue: string[] = [];
  const seen = new Set<string>();

  const enqueue = (url: string) => {
    let clean: URL;
    try {
      clean = new URL(url);
    } catch {
      return;
    }
    if (clean.origin !== origin) return;
    if (NOT_A_PAGE.test(clean.pathname)) return;
    clean.hash = '';
    const key = normalizeUrl(clean.toString());
    if (seen.has(key)) return;
    seen.add(key);
    queue.push(clean.toString());
  };

  enqueue(home);
  for (const [, p] of dbByKey) enqueue(`${origin}/${p.slug}`);
  for (const u of sitemap) enqueue(u);

  // ─── Crawl ───────────────────────────────────────────────────────────────
  interface Crawled {
    url: string;
    row: CrawlRow;
    contextual: string[];
    all: string[];
  }
  const crawled: Crawled[] = [];

  // Le crawl avance par vagues : on traite `concurrency` URL de front, puis on
  // enfile les liens découverts. La découverte reste en largeur d'abord.
  while (queue.length && crawled.length < maxUrls) {
    const wave = queue.splice(0, Math.min(concurrency, maxUrls - crawled.length));

    const results = await inParallel(wave, concurrency, async (url) => {
    const key = normalizeUrl(url);
    const dbPage = dbByKey.get(key);
    const slug = slugOf(url, origin);
    let expected = expectedStateFor(slug, dbPage?.status);

    const res = await fetchUrl(url);

    // Une URL que la base ne connaît pas, absente du sitemap, et qui redirige :
    // c'est une ancienne adresse encore liée quelque part, pas une page qu'on
    // attend dans l'index. La signaler comme « devrait répondre 200 » serait
    // faux — son état normal EST la redirection.
    if (!dbPage && expected === 'indexable' && res.chain.length > 0 && !sitemapKeys.has(key)) {
      expected = 'redirected';
    }
    const facts =
      res.status === 200 && res.html
        ? parsePage(res.html, res.finalUrl, res.headers['x-robots-tag'] || '')
        : null;

    const robotsAllowed = isAllowed(robots, new URL(url).pathname);

    const row: CrawlRow = {
      site_key: site.site_key,
      page_id: dbPage?.id ?? null,
      url,
      slug,
      expected_state: expected,

      http_status: res.status,
      final_url: res.finalUrl,
      redirect_chain: res.chain,
      response_ms: res.ms,

      indexable: facts ? !facts.noindex && robotsAllowed && res.status === 200 : false,
      robots_txt_allowed: robotsAllowed,
      meta_robots: facts?.metaRobots || null,
      canonical: facts?.canonical || null,
      title: facts?.title || null,
      meta_description: facts?.metaDescription || null,
      h1: facts?.h1 || null,
      h1_count: facts?.h1Count ?? null,
      h2_count: facts?.h2Count ?? null,
      structured_data: facts?.structuredData ?? [],
      word_count: facts?.wordCount ?? null,
      content_hash: facts?.contentHash ?? null,
      content_extract: facts?.rendered ?? null,
      links_out: facts?.internalLinks.length ?? null,
      links_in: null,
      click_depth: null,
      in_sitemap: sitemapKeys.has(key),

      gsc_verdict: null,
      gsc_coverage_state: null,
      gsc_indexing_state: null,
      gsc_page_fetch_state: null,
      gsc_robots_state: null,
      gsc_google_canonical: null,
      gsc_last_crawl: null,
      gsc_inspected_at: null,

      funnel_stage: '',
      issues: [],
      impressions28: 0,
      fetchError: res.error,
    };

      return {
        url,
        row,
        contextual: facts?.internalLinks ?? [],
        all: facts?.allInternalLinks ?? [],
      };
    });

    for (const result of results) {
      crawled.push(result);
      // Le parcours des liens ne sert qu'à découvrir : on n'ajoute que ce qui
      // n'est ni déjà connu, ni un fichier.
      for (const link of result.all) enqueue(link);
      onProgress?.(crawled.length, crawled.length + queue.length, result.url);
    }
  }

  if (queue.length) {
    logger.warn(`${site.site_key} : plafond de ${maxUrls} URL atteint, ${queue.length} en attente`);
  }

  // ─── Maillage ────────────────────────────────────────────────────────────
  const graph = buildGraph(
    crawled.map((c) => ({ url: c.url, contextual: c.contextual, all: c.all })),
    home
  );
  for (const c of crawled) {
    const key = normalizeUrl(c.url);
    c.row.links_in = graph.linksIn.get(key) ?? 0;
    c.row.click_depth = graph.depth.has(key) ? graph.depth.get(key)! : null;
  }

  // ─── Impressions 28 j ────────────────────────────────────────────────────
  const since = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
  const { data: positions } = await db
    .from('gsc_positions')
    .select('page_url, impressions')
    .eq('site_key', site.site_key)
    .gte('date', since);

  const impressions = new Map<string, number>();
  for (const p of positions || []) {
    const key = normalizeUrl(p.page_url as string);
    impressions.set(key, (impressions.get(key) || 0) + ((p.impressions as number) || 0));
  }
  for (const c of crawled) {
    c.row.impressions28 = impressions.get(normalizeUrl(c.url)) || 0;
  }

  // ─── Inspection GSC ──────────────────────────────────────────────────────
  const property = inspect ? await resolveProperty(site.site_key) : null;
  if (inspect && !property) {
    logger.warn(`${site.site_key} : aucune propriété GSC accessible — funnel limité aux faits du crawl`);
  }

  if (property) {
    // Les pages hors périmètre et les brouillons ne consomment pas de quota.
    const toInspect = crawled.filter(
      (c) => c.row.expected_state === 'indexable' || c.row.expected_state === 'redirected'
    );

    await inParallel(toInspect, concurrency, async (c) => {
      const result = await inspectUrl(property, c.row.final_url || c.url);
      c.row.gsc_inspected_at = new Date().toISOString();
      if (!result) return;
      c.row.gsc_verdict = result.verdict;
      c.row.gsc_coverage_state = result.coverageState;
      c.row.gsc_indexing_state = result.indexingState;
      c.row.gsc_page_fetch_state = result.pageFetchState;
      c.row.gsc_robots_state = result.robotsTxtState;
      c.row.gsc_google_canonical = result.googleCanonical;
      c.row.gsc_last_crawl = result.lastCrawlTime;
    });
  }

  // ─── Alignement de la base sur ce qui vient d'être constaté ──────────────
  // Fait AVANT la synthèse : la ligne écrite dans crawl_results doit refléter
  // l'état corrigé, sinon le funnel de ce passage juge encore la page sur une
  // vérité qu'on vient de démentir.
  const { data: profil } = await db
    .from('site_profiles')
    .select('delivery_mode')
    .eq('site_key', site.site_key)
    .maybeSingle();
  const siteEnCms = (profil as { delivery_mode?: string } | null)?.delivery_mode === 'cms';

  const alignements: Alignement[] = [];
  for (const c of crawled) {
    const dbPage = dbByKey.get(normalizeUrl(c.url));
    if (!dbPage) continue;
    const prouve = statutProuve(c.row, dbPage.status, siteEnCms);
    if (!prouve || prouve.statut === dbPage.status) continue;

    alignements.push({ page_id: dbPage.id, url: c.url, de: dbPage.status, vers: prouve.statut, preuve: prouve.preuve });
    c.row.expected_state = prouve.statut === 'redirected' ? 'redirected' : 'indexable';
  }

  // ─── Synthèse ────────────────────────────────────────────────────────────
  const hashCounts = new Map<string, number>();
  for (const c of crawled) {
    // Les URL qui ont redirigé servent le contenu de leur cible : les compter
    // ferait apparaître chaque cible comme son propre doublon.
    if (c.row.content_hash && c.row.expected_state === 'indexable' && c.row.redirect_chain.length === 0) {
      hashCounts.set(c.row.content_hash, (hashCounts.get(c.row.content_hash) || 0) + 1);
    }
  }

  for (const c of crawled) {
    c.row.funnel_stage = computeFunnelStage(c.row);
    c.row.issues = detectIssues(c.row, { hashCounts });
  }

  return {
    siteKey: site.site_key,
    domain: base,
    rows: crawled.map((c) => c.row),
    property,
    sitemapError,
    alignements,
  };
}
