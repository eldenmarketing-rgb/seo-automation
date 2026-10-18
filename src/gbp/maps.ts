import { callApi } from '../keywords/dataforseo.js';
import type { MapsItem } from './types.js';

/**
 * `serp/google/maps/live/advanced` — les fiches que Google Maps classe sur une
 * requête, vues depuis un point (centre-ville, zoom 12). 0,002 $ par requête,
 * cache 7 j. C'est l'appel qui a retrouvé la fiche Livraison de Nuit le
 * 2026-10-18 quand la recherche organique ne la montrait pas.
 */

interface RawMapsItem {
  type?: string;
  rank_absolute?: number;
  title?: string;
  category?: string;
  cid?: string;
  place_id?: string;
  rating?: { value?: number; votes_count?: number } | null;
}

interface MapsEnvelope {
  cost?: number;
  tasks?: Array<{ result?: Array<{ items?: RawMapsItem[] }> | null }>;
}

export const MAPS_DEPTH = 20;

export async function fetchMaps(
  keyword: string,
  locationCoordinate: string,
  depth = MAPS_DEPTH,
): Promise<{ items: MapsItem[]; cost: number }> {
  const body = [{ keyword, location_coordinate: locationCoordinate, language_code: 'fr', depth }];
  const data = await callApi<MapsEnvelope>('/serp/google/maps/live/advanced', body);
  const raw = data.tasks?.[0]?.result?.[0]?.items ?? [];
  const items: MapsItem[] = raw
    .filter((i) => i.type === 'maps_search' && i.title)
    .map((i) => ({
      rank: i.rank_absolute ?? 0,
      cid: i.cid ? String(i.cid) : null,
      place_id: i.place_id ?? null,
      name: i.title ?? '',
      category: i.category ?? null,
      rating: i.rating?.value ?? null,
      votes: i.rating?.votes_count ?? null,
    }))
    .sort((a, b) => a.rank - b.rank);
  return { items, cost: data.cost ?? 0 };
}
