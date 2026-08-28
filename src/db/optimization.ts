import { getSupabase } from './client.js';

export interface OptimizationQueueRow {
  seo_page_id?: string;
  site_key: string;
  page_url: string;
  avg_position: number;
  top_queries: Record<string, unknown>[];
  current_content?: Record<string, unknown>;
  optimized_content?: Record<string, unknown>;
  status?: string;
}

/** Alimentée par l'audit GSC hebdomadaire ; consommée à la main (sessions CLI), plus par un job. */
export async function addToOptimizationQueue(row: OptimizationQueueRow) {
  const { data, error } = await getSupabase().from('optimization_queue').insert(row).select().single();
  if (error) throw new Error(`addToOptimizationQueue: ${error.message}`);
  return data;
}
