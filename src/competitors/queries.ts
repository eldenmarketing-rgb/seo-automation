/**
 * Les requêtes sur lesquelles on compare un site à ses concurrents.
 *
 * Ordre des sources, le même que pour les nouvelles pages (CLAUDE.md « Sources
 * des nouvelles pages ») : la demande PROUVÉE d'abord — les requêtes GSC des
 * 28 derniers jours, par impressions — puis, si le site est muet, la tête des
 * clusters approuvés, et en complément les services du profil accolés à la
 * ville. Une hypothèse ne devance jamais une requête prouvée.
 *
 * Pas de filtre « marque » : sur un site local, la marque EST la requête
 * générique (« garage perpignan »). Une requête de marque nous met en #1 et ne
 * pèse pas dans le verdict, elle coûte 0,002 $ — on la garde.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { QueryCandidate } from './types.js';

export const QUERY_LIMITS = {
  total: 30,
  gsc: 20,
  clusters: 10,
  /** Sous ce total d'impressions, le site est « muet » : on complète par les clusters. */
  muteImpressions: 100,
  /** En dessous de ce nombre de requêtes GSC, on complète aussi. */
  minBeforeFallback: 10,
  windowDays: 28,
};

export interface QueryInputs {
  gsc: Array<{ query: string; impressions: number }>;
  clusters: string[];
  services: string[];
  city: string | null;
}

export function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(q: string): string[] {
  return normalizeQuery(q)
    .split(/[\s-]+/)
    .filter((t) => t.length >= 3)
    .map((t) => t.slice(0, 5));
}

/** Vrai si toutes les racines de `needle` sont dans `haystack` (« vidange » ⊂ « vidange perpignan pas cher »). */
function covers(haystack: string, needle: string): boolean {
  const h = new Set(tokens(haystack));
  const n = tokens(needle);
  return n.length > 0 && n.every((t) => h.has(t));
}

export function selectQueries(input: QueryInputs, limits = QUERY_LIMITS): QueryCandidate[] {
  const out: QueryCandidate[] = [];
  const seen = new Set<string>();
  const push = (c: QueryCandidate) => {
    const key = normalizeQuery(c.query);
    if (!key || seen.has(key) || out.length >= limits.total) return;
    seen.add(key);
    out.push({ ...c, query: key });
  };

  // 1. GSC — agrégé par requête, par impressions décroissantes
  const agg = new Map<string, number>();
  for (const r of input.gsc) {
    const key = normalizeQuery(r.query);
    if (!key) continue;
    agg.set(key, (agg.get(key) ?? 0) + (r.impressions || 0));
  }
  const gsc = [...agg.entries()].filter(([, i]) => i > 0).sort((a, b) => b[1] - a[1]);
  const totalImpressions = gsc.reduce((s, [, i]) => s + i, 0);
  for (const [query, impressions] of gsc.slice(0, limits.gsc)) push({ query, source: 'gsc', impressions });

  // 2. Clusters approuvés — seulement si le site est muet ou presque
  const mute = totalImpressions < limits.muteImpressions || out.length < limits.minBeforeFallback;
  if (mute) {
    let added = 0;
    for (const k of input.clusters) {
      if (added >= limits.clusters) break;
      const before = out.length;
      push({ query: k, source: 'cluster', impressions: 0 });
      if (out.length > before) added++;
    }
  }

  // 3. Services du profil + ville — en complément, sans doublonner une requête déjà couverte
  const city = input.city ? normalizeQuery(input.city) : '';
  for (const s of input.services) {
    if (out.length >= limits.total) break;
    const q = city ? `${normalizeQuery(s)} ${city}` : normalizeQuery(s);
    if (out.some((o) => covers(o.query, s))) continue;
    push({ query: q, source: 'service', impressions: 0 });
  }

  return out;
}

const fmt = (d: Date) => d.toISOString().split('T')[0];

/** Lit en base ce dont `selectQueries` a besoin pour un site. */
export async function loadQueryInputs(
  db: SupabaseClient,
  site: { site_key: string; services: unknown; city: string | null },
): Promise<QueryInputs> {
  const { data: maxRow } = await db
    .from('gsc_positions')
    .select('date')
    .eq('site_key', site.site_key)
    .order('date', { ascending: false })
    .limit(1);
  const gsc: QueryInputs['gsc'] = [];
  if (maxRow?.length) {
    const end = new Date(maxRow[0].date as string);
    const start = new Date(end);
    start.setDate(start.getDate() - (QUERY_LIMITS.windowDays - 1));
    // Pagination PostgREST : 1 000 lignes par défaut, un site actif en a plus sur 28 j.
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db
        .from('gsc_positions')
        .select('query, impressions')
        .eq('site_key', site.site_key)
        .gte('date', fmt(start))
        .lte('date', fmt(end))
        .range(from, from + 999);
      if (error) throw new Error(`gsc_positions ${site.site_key}: ${error.message}`);
      for (const r of data || [])
        gsc.push({ query: r.query as string, impressions: (r.impressions as number) || 0 });
      if (!data || data.length < 1000) break;
    }
  }

  const { data: clusters } = await db
    .from('keyword_clusters')
    .select('main_keyword')
    .eq('site_key', site.site_key)
    .eq('status', 'approved');

  const services = Array.isArray(site.services)
    ? (site.services as Array<{ name?: string }>).map((s) => s?.name || '').filter(Boolean)
    : [];

  return {
    gsc,
    clusters: (clusters || []).map((c) => c.main_keyword as string).filter(Boolean),
    services,
    city: site.city,
  };
}
