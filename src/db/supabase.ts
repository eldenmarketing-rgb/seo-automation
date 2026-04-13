import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    client = createClient(url, key);
  }
  return client;
}

// --- SEO Pages ---

export interface SeoPageRow {
  id?: string;
  site_key: string;
  page_type: 'city' | 'service' | 'city_service' | 'topic' | 'topic_intent' | 'product' | 'category';
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

export async function upsertSeoPage(page: SeoPageRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('seo_pages')
    .upsert(page, { onConflict: 'site_key,slug' })
    .select()
    .single();
  if (error) throw new Error(`upsertSeoPage: ${error.message}`);
  return data;
}

export async function getSeoPages(siteKey: string, status?: string) {
  const db = getSupabase();
  let query = db.from('seo_pages').select('*').eq('site_key', siteKey);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`getSeoPages: ${error.message}`);
  return data as SeoPageRow[];
}

export async function getSeoPagesForDeploy(siteKey: string) {
  return getSeoPages(siteKey, 'draft');
}

export async function markPagesDeployed(siteKey: string, slugs: string[]) {
  const db = getSupabase();
  const { error } = await db
    .from('seo_pages')
    .update({ status: 'published', deployed_at: new Date().toISOString() })
    .eq('site_key', siteKey)
    .in('slug', slugs);
  if (error) throw new Error(`markPagesDeployed: ${error.message}`);
}

export async function getExistingSlugs(siteKey: string): Promise<string[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('seo_pages')
    .select('slug')
    .eq('site_key', siteKey);
  if (error) throw new Error(`getExistingSlugs: ${error.message}`);
  return (data || []).map((r: { slug: string }) => r.slug);
}

// --- GSC Positions ---

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

export async function insertGscPositions(rows: GscPositionRow[]) {
  if (rows.length === 0) return;
  const db = getSupabase();
  // Insert in batches of 500
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await db.from('gsc_positions').insert(batch);
    if (error) throw new Error(`insertGscPositions: ${error.message}`);
  }
}

export async function getLatestGscDate(siteKey: string): Promise<string | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('gsc_positions')
    .select('date')
    .eq('site_key', siteKey)
    .order('date', { ascending: false })
    .limit(1)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`getLatestGscDate: ${error.message}`);
  return data?.date || null;
}

// --- Optimization Queue ---

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

export async function addToOptimizationQueue(row: OptimizationQueueRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('optimization_queue')
    .insert(row)
    .select()
    .single();
  if (error) throw new Error(`addToOptimizationQueue: ${error.message}`);
  return data;
}

export async function getPendingOptimizations(siteKey?: string) {
  const db = getSupabase();
  let query = db.from('optimization_queue').select('*').eq('status', 'pending');
  if (siteKey) query = query.eq('site_key', siteKey);
  const { data, error } = await query.order('avg_position', { ascending: true });
  if (error) throw new Error(`getPendingOptimizations: ${error.message}`);
  return data;
}

export async function updateOptimizationStatus(id: string, status: string, optimizedContent?: Record<string, unknown>) {
  const db = getSupabase();
  const update: Record<string, unknown> = { status, processed_at: new Date().toISOString() };
  if (optimizedContent) update.optimized_content = optimizedContent;
  const { error } = await db.from('optimization_queue').update(update).eq('id', id);
  if (error) throw new Error(`updateOptimizationStatus: ${error.message}`);
}

// --- Automation Logs ---

export async function log(jobName: string, action: string, status: 'success' | 'error' | 'warning' | 'info', siteKey?: string, details?: Record<string, unknown>, durationMs?: number) {
  const db = getSupabase();
  await db.from('automation_logs').insert({
    job_name: jobName,
    site_key: siteKey,
    action,
    status,
    details: details || {},
    duration_ms: durationMs,
  });
}

// --- Bot Settings ---

export interface BotSettingsRow {
  site_key: string;
  phone?: string;
  address?: string;
  horaires?: Record<string, string>;
  promo_text?: string;
  gbp_link?: string;
  custom_cta?: string;
  updated_at?: string;
}

export async function getBotSettings(siteKey: string): Promise<BotSettingsRow | null> {
  const db = getSupabase();
  const { data, error } = await db
    .from('bot_settings')
    .select('*')
    .eq('site_key', siteKey)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`getBotSettings: ${error.message}`);
  return data as BotSettingsRow | null;
}

export async function upsertBotSettings(settings: BotSettingsRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('bot_settings')
    .upsert(settings, { onConflict: 'site_key' })
    .select()
    .single();
  if (error) throw new Error(`upsertBotSettings: ${error.message}`);
  return data;
}

// --- Page Images ---

export interface PageImageRow {
  id?: string;
  site_key: string;
  slug: string;
  image_type: 'ai' | 'real' | 'stock';
  file_path: string;
  alt_text: string;
  width?: number;
  height?: number;
  size_kb?: number;
}

export async function upsertPageImage(image: PageImageRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('page_images')
    .upsert(image, { onConflict: 'site_key,slug' })
    .select()
    .single();
  if (error) throw new Error(`upsertPageImage: ${error.message}`);
  return data;
}

export async function getPageImages(siteKey: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('page_images')
    .select('*')
    .eq('site_key', siteKey);
  if (error) throw new Error(`getPageImages: ${error.message}`);
  return data as PageImageRow[];
}

// --- Blog Articles ---

export interface BlogArticleRow {
  id?: string;
  site_key: string;
  slug: string;
  title: string;
  meta_description?: string;
  content: string;
  featured_image?: string;
  tags?: string[];
  internal_links?: Record<string, unknown>[];
  status?: 'draft' | 'published';
  published_at?: string;
}

export async function upsertBlogArticle(article: BlogArticleRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('blog_articles')
    .upsert(article, { onConflict: 'site_key,slug' })
    .select()
    .single();
  if (error) throw new Error(`upsertBlogArticle: ${error.message}`);
  return data;
}

export async function getBlogArticles(siteKey: string, status?: string) {
  const db = getSupabase();
  let query = db.from('blog_articles').select('*').eq('site_key', siteKey);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`getBlogArticles: ${error.message}`);
  return data as BlogArticleRow[];
}

export async function publishBlogArticle(id: string) {
  const db = getSupabase();
  const { error } = await db
    .from('blog_articles')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(`publishBlogArticle: ${error.message}`);
}

// --- Vehicles ---

export interface VehicleRow {
  id?: string;
  garage_id?: string;
  slug?: string;
  marque: string;
  modele: string;
  annee: number;
  km: number;
  prix: number;
  carburant?: string;
  boite?: string;
  couleur?: string;
  puissance?: string;
  doors?: number;
  description?: string;
  seo_title?: string;
  seo_description?: string;
  photos?: Record<string, unknown>;
  status?: string;
  featured?: boolean;
  created_at?: string;
  updated_at?: string;
}

export async function upsertVehicle(vehicle: VehicleRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('vehicles')
    .upsert(vehicle)
    .select()
    .single();
  if (error) throw new Error(`upsertVehicle: ${error.message}`);
  return data;
}

export async function getVehicles(status?: string) {
  const db = getSupabase();
  let query = db.from('vehicles').select('*');
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw new Error(`getVehicles: ${error.message}`);
  return data as VehicleRow[];
}

export async function getVehicleBySlug(slug: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('vehicles')
    .select('*')
    .eq('slug', slug)
    .single();
  if (error && error.code !== 'PGRST116') throw new Error(`getVehicleBySlug: ${error.message}`);
  return data as VehicleRow | null;
}

export async function updateVehicleStatus(id: string, status: string) {
  const db = getSupabase();
  const { error } = await db.from('vehicles').update({ status }).eq('id', id);
  if (error) throw new Error(`updateVehicleStatus: ${error.message}`);
}

// --- Menu (Restaurant) ---

export interface MenuCategoryRow {
  id?: string;
  site_key: string;
  slug: string;
  name: string;
  description?: string;
  display_order?: number;
}

export interface MenuItemRow {
  id?: string;
  category_id: string;
  name: string;
  description?: string;
  price: number;
  photo?: string;
  allergens?: string[];
  is_vegetarian?: boolean;
  is_spicy?: boolean;
  status?: 'available' | 'unavailable' | 'seasonal';
  display_order?: number;
}

export async function getMenuCategories(siteKey: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('menu_categories')
    .select('*')
    .eq('site_key', siteKey)
    .order('display_order', { ascending: true });
  if (error) throw new Error(`getMenuCategories: ${error.message}`);
  return data as MenuCategoryRow[];
}

export async function upsertMenuCategory(category: MenuCategoryRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('menu_categories')
    .upsert(category, { onConflict: 'site_key,slug' })
    .select()
    .single();
  if (error) throw new Error(`upsertMenuCategory: ${error.message}`);
  return data;
}

export async function getMenuItems(categoryId: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .eq('status', 'available')
    .order('display_order', { ascending: true });
  if (error) throw new Error(`getMenuItems: ${error.message}`);
  return data as MenuItemRow[];
}

export async function getFullMenu(siteKey: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('menu_categories')
    .select('*, menu_items(*)')
    .eq('site_key', siteKey)
    .order('display_order', { ascending: true });
  if (error) throw new Error(`getFullMenu: ${error.message}`);
  return data;
}

export async function upsertMenuItem(item: MenuItemRow) {
  const db = getSupabase();
  const { data, error } = await db
    .from('menu_items')
    .upsert(item)
    .select()
    .single();
  if (error) throw new Error(`upsertMenuItem: ${error.message}`);
  return data;
}

// --- Pending Pages ---

export interface PendingPageRow {
  id?: string;
  site_key: string;
  slug: string;
  page_type: 'city' | 'service' | 'city_service' | 'topic' | 'topic_intent' | 'product' | 'category';
  service_slug?: string;
  city_slug?: string;
  score: number;
  score_details?: string;
  status?: 'pending_approval' | 'approved' | 'rejected' | 'generating' | 'generated' | 'error';
  batch_id?: string;
  created_at?: string;
  updated_at?: string;
}

export async function upsertPendingPages(rows: PendingPageRow[]) {
  if (rows.length === 0) return 0;
  const db = getSupabase();
  let stored = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await db
      .from('pending_pages')
      .upsert(batch, { onConflict: 'site_key,slug' });
    if (error) {
      if (error.message.includes('relation') && error.message.includes('does not exist')) return -1;
      throw new Error(`upsertPendingPages: ${error.message}`);
    }
    stored += batch.length;
  }
  return stored;
}

export async function getPendingPages(siteKey?: string, status?: string) {
  const db = getSupabase();
  let query = db.from('pending_pages').select('*');
  if (siteKey) query = query.eq('site_key', siteKey);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('score', { ascending: false });
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getPendingPages: ${error.message}`);
  }
  return data as PendingPageRow[];
}

export async function updatePendingPageStatus(id: string, status: string) {
  const db = getSupabase();
  const { error } = await db
    .from('pending_pages')
    .update({ status })
    .eq('id', id);
  if (error) throw new Error(`updatePendingPageStatus: ${error.message}`);
}

export async function updatePendingPagesBulk(siteKey: string, fromStatus: string, toStatus: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('pending_pages')
    .update({ status: toStatus })
    .eq('site_key', siteKey)
    .eq('status', fromStatus)
    .select();
  if (error) throw new Error(`updatePendingPagesBulk: ${error.message}`);
  return data?.length || 0;
}

export async function updateAllPendingPagesBulk(fromStatus: string, toStatus: string) {
  const db = getSupabase();
  const { data, error } = await db
    .from('pending_pages')
    .update({ status: toStatus })
    .eq('status', fromStatus)
    .select();
  if (error) throw new Error(`updateAllPendingPagesBulk: ${error.message}`);
  return data?.length || 0;
}

export async function deletePendingPages(siteKey: string, status?: string) {
  const db = getSupabase();
  let query = db.from('pending_pages').delete().eq('site_key', siteKey);
  if (status) query = query.eq('status', status);
  const { error } = await query;
  if (error) throw new Error(`deletePendingPages: ${error.message}`);
}

// --- Discovered Keywords ---

export interface DiscoveredKeywordRow {
  id?: string;
  site_key: string;
  keyword: string;
  score: number;
  source: string;
  suggested_page?: string;
  status?: 'new' | 'approved' | 'rejected' | 'opportunity' | 'covered';
  created_at?: string;
  volume?: number;
  cpc?: number;
  competition?: string;
  intent_type?: string;
}

export async function upsertDiscoveredKeywords(rows: DiscoveredKeywordRow[]) {
  if (rows.length === 0) return 0;
  const db = getSupabase();
  let stored = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await db
      .from('discovered_keywords')
      .upsert(batch, { onConflict: 'site_key,keyword' });
    if (error) {
      // Table might not exist yet — log and skip
      if (error.message.includes('relation') && error.message.includes('does not exist')) return -1;
      throw new Error(`upsertDiscoveredKeywords: ${error.message}`);
    }
    stored += batch.length;
  }
  return stored;
}

export async function getDiscoveredKeywords(siteKey: string, status?: string) {
  const db = getSupabase();
  let query = db.from('discovered_keywords').select('*').eq('site_key', siteKey);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('score', { ascending: false });
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getDiscoveredKeywords: ${error.message}`);
  }
  return data as DiscoveredKeywordRow[];
}

/**
 * Get top keyword opportunities grouped by suggested_page.
 * Returns pages sorted by best keyword score, with keyword count and top keywords.
 */
export interface KeywordOpportunity {
  suggested_page: string;
  best_score: number;
  keyword_count: number;
  top_keywords: string[];
  site_key: string;
}

export async function getTopKeywordOpportunities(siteKey: string, limit = 20): Promise<KeywordOpportunity[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('discovered_keywords')
    .select('keyword, score, suggested_page')
    .eq('site_key', siteKey)
    .in('status', ['opportunity', 'new'])
    .order('score', { ascending: false })
    .limit(500);
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getTopKeywordOpportunities: ${error.message}`);
  }
  if (!data || data.length === 0) return [];

  // Group by suggested_page
  const byPage = new Map<string, { scores: number[]; keywords: string[] }>();
  for (const row of data) {
    const page = row.suggested_page || 'unknown';
    const entry = byPage.get(page) || { scores: [], keywords: [] };
    entry.scores.push(row.score);
    entry.keywords.push(row.keyword);
    byPage.set(page, entry);
  }

  // Aggregate and sort
  const opportunities: KeywordOpportunity[] = [];
  for (const [page, { scores, keywords }] of Array.from(byPage.entries())) {
    opportunities.push({
      suggested_page: page,
      best_score: Math.max(...scores),
      keyword_count: keywords.length,
      top_keywords: keywords.slice(0, 5),
      site_key: siteKey,
    });
  }

  return opportunities
    .sort((a, b) => b.best_score - a.best_score || b.keyword_count - a.keyword_count)
    .slice(0, limit);
}

/**
 * Count discovered keywords per service slug pattern for a site.
 * Returns a map of serviceSlug → keyword count.
 */
export async function countKeywordsByService(siteKey: string, serviceSlugs: string[]): Promise<Map<string, number>> {
  const db = getSupabase();
  const result = new Map<string, number>();

  // Fetch all suggested_page values for this site in one query
  const { data, error } = await db
    .from('discovered_keywords')
    .select('suggested_page')
    .eq('site_key', siteKey)
    .not('suggested_page', 'is', null);

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) {
      for (const slug of serviceSlugs) result.set(slug, 0);
      return result;
    }
    throw new Error(`countKeywordsByService: ${error.message}`);
  }

  // Count per service prefix
  for (const slug of serviceSlugs) {
    const count = (data || []).filter(r => r.suggested_page && r.suggested_page.startsWith(slug)).length;
    result.set(slug, count);
  }

  return result;
}

// --- Page Keyword Scores (Supabase-only scoring) ---

export interface PageKeywordScore {
  suggested_page: string;
  total_volume: number;
  avg_kd: number;
  avg_cpc: number;
  keyword_count: number;
  top_keywords: Array<{ keyword: string; volume: number; cpc: number; competition: string }>;
}

const KD_MAP: Record<string, number> = { LOW: 20, MEDIUM: 50, HIGH: 80 };

/**
 * Get keyword scores aggregated by suggested_page for a site.
 * Used by daily-generate to score candidates purely from Supabase data.
 * Returns pages sorted by total_volume DESC, avg_kd ASC.
 */
export async function getPageKeywordScores(siteKey: string): Promise<PageKeywordScore[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('discovered_keywords')
    .select('keyword, volume, cpc, competition, suggested_page')
    .eq('site_key', siteKey)
    .not('suggested_page', 'is', null)
    .order('volume', { ascending: false });

  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getPageKeywordScores: ${error.message}`);
  }
  if (!data || data.length === 0) return [];

  // Group by suggested_page
  const byPage = new Map<string, { volumes: number[]; kds: number[]; cpcs: number[]; keywords: Array<{ keyword: string; volume: number; cpc: number; competition: string }> }>();

  for (const row of data) {
    const page = row.suggested_page;
    if (!page) continue;
    const entry = byPage.get(page) || { volumes: [], kds: [], cpcs: [], keywords: [] };
    entry.volumes.push(row.volume || 0);
    entry.kds.push(KD_MAP[row.competition] || 50);
    entry.cpcs.push(row.cpc || 0);
    entry.keywords.push({ keyword: row.keyword, volume: row.volume || 0, cpc: row.cpc || 0, competition: row.competition || '' });
    byPage.set(page, entry);
  }

  const results: PageKeywordScore[] = [];
  for (const [page, d] of byPage.entries()) {
    results.push({
      suggested_page: page,
      total_volume: d.volumes.reduce((a, b) => a + b, 0),
      avg_kd: Math.round(d.kds.reduce((a, b) => a + b, 0) / d.kds.length),
      avg_cpc: Math.round((d.cpcs.reduce((a, b) => a + b, 0) / d.cpcs.length) * 100) / 100,
      keyword_count: d.keywords.length,
      top_keywords: d.keywords.sort((a, b) => b.volume - a.volume).slice(0, 5),
    });
  }

  return results.sort((a, b) => b.total_volume - a.total_volume || a.avg_kd - b.avg_kd);
}

// --- Keyword Clusters ---

export interface KeywordClusterRow {
  id?: string;
  site_key: string;
  cluster_name: string;
  main_keyword: string;
  total_volume: number;
  keyword_count: number;
  keywords_list: Array<{ keyword: string; volume: number; score: number }>;
  suggested_slug?: string;
  status?: string;
  dominant_intent?: string;
}

/**
 * Get keyword clusters matching a slug pattern for a site.
 * Used by page-generator-v2 to inject all cluster keywords into the prompt.
 */
export async function getClusterForSlug(siteKey: string, slug: string): Promise<KeywordClusterRow | null> {
  const db = getSupabase();
  // Try exact match on suggested_slug first
  const { data: exact, error: err1 } = await db
    .from('keyword_clusters')
    .select('*')
    .eq('site_key', siteKey)
    .eq('suggested_slug', slug)
    .order('total_volume', { ascending: false })
    .limit(1);
  if (!err1 && exact && exact.length > 0) return exact[0] as KeywordClusterRow;

  // Try matching cluster_name against slug tokens
  const slugTokens = slug.replace(/\[ville\]/g, '').replace(/-+/g, ' ').trim();
  if (!slugTokens) return null;
  const { data: fuzzy, error: err2 } = await db
    .from('keyword_clusters')
    .select('*')
    .eq('site_key', siteKey)
    .ilike('cluster_name', `%${slugTokens.split(' ')[0]}%`)
    .order('total_volume', { ascending: false })
    .limit(5);
  if (err2 || !fuzzy || fuzzy.length === 0) return null;

  // Find best match by token overlap
  const slugParts = new Set(slugTokens.toLowerCase().split(/\s+/));
  let best: any = null;
  let bestOverlap = 0;
  for (const row of fuzzy) {
    const clusterParts = (row.cluster_name || '').toLowerCase().split(/\s+/);
    let overlap = 0;
    for (const t of clusterParts) {
      if (slugParts.has(t)) overlap++;
    }
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = row;
    }
  }
  return bestOverlap > 0 ? (best as KeywordClusterRow) : null;
}

/**
 * Get top clusters for a site, used by /generate to show opportunities.
 */
export async function getTopClusters(siteKey: string, limit = 10): Promise<KeywordClusterRow[]> {
  const db = getSupabase();
  const { data, error } = await db
    .from('keyword_clusters')
    .select('*')
    .eq('site_key', siteKey)
    .order('total_volume', { ascending: false })
    .limit(limit);
  if (error) {
    if (error.message.includes('relation') && error.message.includes('does not exist')) return [];
    throw new Error(`getTopClusters: ${error.message}`);
  }
  return (data || []) as KeywordClusterRow[];
}

// --- Optimization Candidates View ---

export async function getOptimizationCandidates(siteKey?: string) {
  const db = getSupabase();
  let query = db.from('v_optimization_candidates').select('*');
  if (siteKey) query = query.eq('site_key', siteKey);
  const { data, error } = await query;
  if (error) throw new Error(`getOptimizationCandidates: ${error.message}`);
  return data;
}
