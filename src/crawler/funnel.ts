/**
 * Position d'une URL dans le funnel d'indexation.
 *
 * DEPLOYED → HTTP_200 → INDEXABLE → IN_SITEMAP → INTERNALLY_LINKED
 *          → DISCOVERED → CRAWLED → INDEXED → RECEIVING_IMPRESSIONS
 *
 * Le funnel rend l'étape la plus avancée **prouvée**, pas la dernière étape
 * d'une chaîne stricte : une page indexée par Google mais absente du sitemap est
 * indexée, point. Le prérequis manquant est signalé par `issues.ts`, il ne sert
 * pas à faire mentir la mesure.
 *
 * Une réponse GSC absente (quota, propriété non partagée) laisse le funnel
 * s'arrêter aux faits déterministes : « pas de réponse » n'est pas
 * « pas indexée ».
 */
import type { CrawlRow } from './types.js';
import { FUNNEL_STAGES } from './types.js';

type Stage = (typeof FUNNEL_STAGES)[number];

const rank = (stage: Stage) => FUNNEL_STAGES.indexOf(stage);

/** Ce que dit Google, traduit en étape de funnel. `null` = Google n'a rien dit. */
export function gscStage(row: CrawlRow): Stage | 'NONE' | null {
  if (!row.gsc_verdict && !row.gsc_coverage_state) return null;

  const coverage = (row.gsc_coverage_state || '').toLowerCase();

  if (
    row.gsc_verdict === 'PASS' ||
    coverage.includes('submitted and indexed') ||
    coverage.startsWith('indexed')
  ) {
    return 'INDEXED';
  }
  if (coverage.includes('unknown to google')) return 'NONE';
  if (row.gsc_last_crawl || coverage.includes('crawled')) return 'CRAWLED';
  if (coverage.includes('discovered')) return 'DISCOVERED';

  // Connue de Google pour un autre motif (exclusion, canonical alternative…) :
  // au minimum découverte.
  return 'DISCOVERED';
}

export function computeFunnelStage(row: CrawlRow): string {
  if (row.expected_state === 'out_of_scope') return 'OUT_OF_SCOPE';

  if (row.expected_state === 'redirected') {
    if (row.redirect_chain.length > 0) return 'REDIRECTED';
    return row.http_status === 200 ? 'STILL_LIVE' : 'GONE';
  }

  if (row.expected_state === 'draft') {
    return row.http_status === 200 ? 'LIVE_UNEXPECTED' : 'NOT_DEPLOYED';
  }

  // Chaîne déterministe : chaque étape suppose la précédente.
  let stage: Stage = 'DEPLOYED';
  if (row.http_status === 200) {
    stage = 'HTTP_200';
    if (row.indexable) {
      stage = 'INDEXABLE';
      if (row.in_sitemap) {
        stage = 'IN_SITEMAP';
        if ((row.links_in ?? 0) > 0 || row.click_depth !== null) stage = 'INTERNALLY_LINKED';
      }
    }
  }

  // Preuve venue de Google : elle peut dépasser la chaîne déterministe.
  const fromGsc = gscStage(row);
  if (fromGsc && fromGsc !== 'NONE' && rank(fromGsc) > rank(stage)) stage = fromGsc;

  // Des impressions prouvent l'indexation, même si l'inspection n'a rien rendu.
  if (row.impressions28 > 0) stage = 'RECEIVING_IMPRESSIONS';

  return stage;
}
