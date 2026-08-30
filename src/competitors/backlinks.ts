/**
 * Profil de liens d'un domaine — DataForSEO Backlinks (cache 14 j).
 *
 * Deux appels : le résumé (rang, nombre de domaines référents, première
 * apparition) et la liste des domaines référents classés. C'est cette liste
 * qui a révélé, sur Carrosserie, que « 77 domaines référents » voulait dire
 * « 77 domaines de PBN » — un compteur seul aurait menti.
 */
import { callApi } from '../keywords/dataforseo.js';
import * as logger from '../utils/logger.js';
import { classifyDomain } from './classify.js';
import type { DomainSummary, ReferringDomain } from './types.js';

interface SummaryEnvelope {
  cost?: number;
  tasks?: Array<{
    result?: Array<{
      rank?: number;
      backlinks?: number;
      referring_domains?: number;
      referring_main_domains?: number;
      first_seen?: string | null;
    }>;
  }>;
}

interface ReferringEnvelope {
  cost?: number;
  tasks?: Array<{
    result?: Array<{
      items?: Array<{ domain?: string; rank?: number; backlinks?: number; first_seen?: string | null }>;
    }>;
  }>;
}

export async function backlinkSummary(
  domain: string,
): Promise<{ summary: DomainSummary | null; cost: number }> {
  try {
    const data = await callApi<SummaryEnvelope>('/backlinks/summary/live', [
      { target: domain, internal_list_limit: 1, backlinks_status_type: 'live' },
    ]);
    const r = data.tasks?.[0]?.result?.[0];
    if (!r) return { summary: null, cost: data.cost || 0 };
    return {
      summary: {
        rank: r.rank || 0,
        backlinks: r.backlinks || 0,
        referring_domains: r.referring_main_domains ?? r.referring_domains ?? 0,
        first_seen: r.first_seen ? r.first_seen.slice(0, 10) : null,
      },
      cost: data.cost || 0,
    };
  } catch (e) {
    logger.warn(`Backlinks summary ${domain} : ${(e as Error).message}`);
    return { summary: null, cost: 0 };
  }
}

export async function referringDomains(
  domain: string,
  limit = 250,
): Promise<{ domains: ReferringDomain[]; cost: number }> {
  try {
    // Corps identique au oneshot VTC : les réponses déjà achetées restent valables en cache.
    const data = await callApi<ReferringEnvelope>('/backlinks/referring_domains/live', [
      { target: domain, limit, order_by: ['rank,desc'], filters: [['backlinks', '>', 0]] },
    ]);
    const items = data.tasks?.[0]?.result?.[0]?.items || [];
    const domains = items
      .filter((i) => i.domain)
      .map((i) => ({
        domain: (i.domain as string).toLowerCase(),
        rank: i.rank || 0,
        backlinks: i.backlinks || 0,
        first_seen: i.first_seen ? i.first_seen.slice(0, 10) : null,
        category: classifyDomain(i.domain as string),
      }));
    return { domains, cost: data.cost || 0 };
  } catch (e) {
    logger.warn(`Backlinks referring ${domain} : ${(e as Error).message}`);
    return { domains: [], cost: 0 };
  }
}
