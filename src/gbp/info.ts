import { callApi } from '../keywords/dataforseo.js';
import type { ListingFacts } from './types.js';

/**
 * `business_data/google/my_business_info/live` — ce que Google affiche d'une
 * fiche (nom, catégorie, horaires, note, votes, site, tél). 0,0054 $ mesuré le
 * 2026-10-18 ; passe par le cache DataForSEO (7 j) comme tout `callApi`.
 * Cible = `cid` (fiche connue) ou `keyword` (découverte : nom + ville).
 */

interface InfoItem {
  title?: string;
  category?: string;
  additional_categories?: string[];
  address?: string;
  phone?: string;
  url?: string;
  domain?: string;
  cid?: string;
  place_id?: string;
  rating?: { value?: number; votes_count?: number } | null;
  work_time?: { work_hours?: { timetable?: unknown } } | null;
  is_claimed?: boolean;
  total_photos?: number;
  [k: string]: unknown;
}

interface InfoEnvelope {
  cost?: number;
  tasks?: Array<{ status_code?: number; result?: Array<{ items?: InfoItem[] }> | null }>;
}

const toFacts = (it: InfoItem): ListingFacts => ({
  cid: it.cid ? String(it.cid) : null,
  place_id: it.place_id ?? null,
  name: it.title ?? '',
  primary_category: it.category ?? null,
  categories: [it.category, ...(it.additional_categories ?? [])].filter((c): c is string => !!c),
  hours: it.work_time?.work_hours?.timetable ?? null,
  website: it.url ?? null,
  phone: it.phone ?? null,
  rating: it.rating?.value ?? null,
  votes: it.rating?.votes_count ?? null,
  is_claimed: typeof it.is_claimed === 'boolean' ? it.is_claimed : null,
  photos: typeof it.total_photos === 'number' ? it.total_photos : null,
  raw: it as Record<string, unknown>,
});

export async function fetchListingInfo(
  target: { cid: string } | { keyword: string },
  location: string,
): Promise<{ facts: ListingFacts | null; cost: number }> {
  // `keyword` est obligatoire sur l'endpoint live ; une fiche connue se cible par « cid:<cid> ».
  const keyword = 'cid' in target ? `cid:${target.cid}` : target.keyword;
  const body = [{ keyword, location_name: location, language_code: 'fr' }];
  const data = await callApi<InfoEnvelope>('/business_data/google/my_business_info/live', body);
  const items = data.tasks?.[0]?.result?.[0]?.items ?? [];
  const first = items.find((i) => i.title);
  return { facts: first ? toFacts(first) : null, cost: data.cost ?? 0 };
}
