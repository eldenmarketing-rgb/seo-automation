/** Types partagés du crawler B2. */

/**
 * Ce qu'on attend de l'URL — la colonne qui empêche le système de traiter une
 * page supprimée exprès comme un échec d'indexation.
 */
export type ExpectedState = 'indexable' | 'redirected' | 'draft' | 'out_of_scope';

export interface CrawlRow {
  site_key: string;
  page_id: string | null;
  url: string;
  slug: string;
  expected_state: ExpectedState;

  http_status: number | null;
  final_url: string | null;
  redirect_chain: Array<{ url: string; status: number }>;
  response_ms: number | null;

  indexable: boolean | null;
  robots_txt_allowed: boolean | null;
  meta_robots: string | null;
  canonical: string | null;
  title: string | null;
  meta_description: string | null;
  h1: string | null;
  h1_count: number | null;
  h2_count: number | null;
  structured_data: string[];
  word_count: number | null;
  content_hash: string | null;
  links_out: number | null;
  links_in: number | null;
  click_depth: number | null;
  in_sitemap: boolean | null;

  gsc_verdict: string | null;
  gsc_coverage_state: string | null;
  gsc_indexing_state: string | null;
  gsc_page_fetch_state: string | null;
  gsc_robots_state: string | null;
  gsc_google_canonical: string | null;
  gsc_last_crawl: string | null;
  gsc_inspected_at: string | null;

  funnel_stage: string;
  issues: string[];

  /** Impressions 28 j (lues dans gsc_positions) — sert au funnel, pas stocké. */
  impressions28: number;
  /** Erreur réseau éventuelle — affichée en console, pas stockée. */
  fetchError?: string;
}

export interface SiteCrawlResult {
  siteKey: string;
  domain: string;
  rows: CrawlRow[];
  property: string | null;
  sitemapError?: string;
}

/** Étapes du funnel, dans l'ordre. */
export const FUNNEL_STAGES = [
  'DEPLOYED',
  'HTTP_200',
  'INDEXABLE',
  'IN_SITEMAP',
  'INTERNALLY_LINKED',
  'DISCOVERED',
  'CRAWLED',
  'INDEXED',
  'RECEIVING_IMPRESSIONS',
] as const;

/** Normalisation pour comparer deux URL (protocole, www, slash final). */
export function sameUrl(a: string, b: string): boolean {
  return normalizeUrl(a) === normalizeUrl(b);
}

export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, '');
    return `${u.host.replace(/^www\./, '')}${path}${u.search}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}
