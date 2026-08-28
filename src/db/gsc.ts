import { getSupabase } from './client.js';

export interface GscPositionRow {
  site_key: string;
  page_url: string;
  query: string;
  position: number;
  clicks: number;
  impressions: number;
  ctr: number;
  date: string;
}

const BATCH = 500;

export async function insertGscPositions(rows: GscPositionRow[]) {
  if (rows.length === 0) return;
  const db = getSupabase();
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await db.from('gsc_positions').insert(rows.slice(i, i + BATCH));
    if (error) throw new Error(`insertGscPositions: ${error.message}`);
  }
}

export async function getLatestGscDate(siteKey: string): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('gsc_positions')
    .select('date')
    .eq('site_key', siteKey)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  // PGRST116 = aucune ligne : un site sans historique n'est pas une erreur
  if (error && error.code !== 'PGRST116') throw new Error(`getLatestGscDate: ${error.message}`);
  return data?.date || null;
}
