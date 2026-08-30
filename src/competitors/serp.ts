/**
 * SERP d'une requête — top 10 mobile, organique + pack local.
 *
 * Distinct de `src/serp/competitor-analysis.ts` (desktop, top 5, réservé aux
 * briefs) : ici on veut savoir qui est devant NOUS et si un pack local
 * précède l'organique, pas ce qu'il faut écrire. Sur un site local la SERP
 * est celle d'un internaute à Perpignan — « carrossier » sans ville tapé
 * depuis Paris ne dit rien de notre marché.
 *
 * Passe par `callApi` (cache 7 j pour les SERP) : relancer le job dans la
 * semaine ne repaie rien.
 */
import { callApi } from '../keywords/dataforseo.js';
import * as logger from '../utils/logger.js';
import { normalizeDomain } from './classify.js';
import type { SerpItem } from './types.js';

export const LOCATION_LOCAL = 'Perpignan,Occitanie,France';
export const LOCATION_NATIONAL = 'France';
const DEPTH = 10;

interface RawItem {
  type?: string;
  rank_absolute?: number;
  rank_group?: number;
  domain?: string;
  url?: string;
  title?: string;
  rating?: { value?: number; votes_count?: number } | null;
}

interface SerpEnvelope {
  cost?: number;
  tasks?: Array<{ result?: Array<{ items?: RawItem[] }> }>;
}

export interface SerpFetch {
  items: SerpItem[];
  /** Coût déclaré par DataForSEO pour cette réponse (0 si servie du cache — le cache conserve le coût d'origine). */
  cost: number;
  location: string;
}

function toItems(raw: RawItem[]): SerpItem[] {
  const items: SerpItem[] = [];
  for (const it of raw) {
    if (it.type !== 'organic' && it.type !== 'local_pack') continue;
    const domain = normalizeDomain(it.domain || it.url || '');
    if (!domain) continue;
    items.push({
      position: it.rank_absolute || it.rank_group || 0,
      type: it.type,
      domain,
      url: it.url || '',
      title: (it.title || '').slice(0, 200),
      rating: it.rating?.value ?? null,
      votes: it.rating?.votes_count ?? null,
    });
  }
  return items.sort((a, b) => a.position - b.position);
}

async function fetchAt(query: string, location: string): Promise<SerpFetch> {
  const body = [
    { keyword: query, location_name: location, language_code: 'fr', device: 'mobile', depth: DEPTH },
  ];
  const data = await callApi<SerpEnvelope>('/serp/google/organic/live/advanced', body);
  const raw = data.tasks?.[0]?.result?.[0]?.items || [];
  return { items: toItems(raw), cost: data.cost || 0, location };
}

export async function fetchSerp(query: string, opts: { local: boolean }): Promise<SerpFetch> {
  const location = opts.local ? LOCATION_LOCAL : LOCATION_NATIONAL;
  try {
    return await fetchAt(query, location);
  } catch (e) {
    // Une localisation refusée ne doit pas faire perdre la requête : on retombe
    // sur la France entière, en le disant.
    if (opts.local && /location/i.test((e as Error).message)) {
      logger.warn(`SERP « ${query} » : localisation ${location} refusée, repli France`);
      return fetchAt(query, LOCATION_NATIONAL);
    }
    throw e;
  }
}
