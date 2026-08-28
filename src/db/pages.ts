import { getSupabase } from './client.js';

/** Types de page réels — même liste que `seo_pages_page_type_check` (migration-page-types.sql). */
export type PageType =
  | 'service'
  | 'city_service'
  | 'city'
  | 'hub'
  | 'category'
  | 'article'
  | 'product'
  | 'home'
  | 'utility'
  // Anciens types encore présents sur quelques lignes
  | 'topic'
  | 'topic_intent';

export interface SeoPageRow {
  id?: string;
  site_key: string;
  page_type: PageType;
  slug: string;
  city?: string;
  service?: string;
  meta_title: string;
  meta_description: string;
  h1: string;
  content: Record<string, unknown>;
  schema_org?: Record<string, unknown>;
  status?: string;
  version?: number;
  deployed_at?: string;
  created_at?: string;
  updated_at?: string;
  intent?: string;
  mode?: string;
}

export async function getExistingSlugs(siteKey: string): Promise<string[]> {
  const { data, error } = await getSupabase().from('seo_pages').select('slug').eq('site_key', siteKey);
  if (error) throw new Error(`getExistingSlugs: ${error.message}`);
  return (data || []).map((r: { slug: string }) => r.slug);
}

/** Nombre de pages par statut pour un site (`/status` du bot). */
export async function countPagesByStatus(siteKey: string): Promise<Record<string, number>> {
  const { data, error } = await getSupabase().from('seo_pages').select('status').eq('site_key', siteKey);
  if (error) throw new Error(`countPagesByStatus: ${error.message}`);
  const counts: Record<string, number> = {};
  for (const row of (data || []) as Array<{ status: string | null }>) {
    const key = row.status ?? 'inconnu';
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
